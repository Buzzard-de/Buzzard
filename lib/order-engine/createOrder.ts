import { getMarket } from "@/lib/market-engine/registry";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { runTradeRouteFulfillmentPipeline } from "@/lib/trade-route-fulfillment";
import {
  generateOrderId,
  generateOrderNumber,
  getIdempotentOrder,
  saveOrder,
} from "./registry";
import { validateCreateOrderInput } from "./validation";
import { buildItemPriceSnapshot, buildOrderItemFromSnapshot, calculateOrderTotals } from "./pricing";
import { reserveInventoryForOrder, rollbackReservations } from "./reservation";
import { selectSupplierForOrderItem } from "./supplier";
import { createPendingPayment, authorizePayment, capturePayment } from "./payment";
import { prepareSupplierOrders } from "./fulfillment";
import { assertOrderTransition } from "./status";
import { createReturnRefundFoundation } from "./returns";
import { emitOrderEvent } from "./events";
import { recordOrderAudit, recordStatusTransition } from "./audit";
import type { BuzzardOrder, CreateOrderInput, CreateOrderResult, MarketChannelSnapshot } from "./types";

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const validation = validateCreateOrderInput(input);
  if (!validation.valid) {
    return {
      ok: false,
      errorCode: "VALIDATION_FAILED",
      errorMessage: validation.errors.map((e) => e.message).join(", "),
    };
  }

  const existing = getIdempotentOrder(input.idempotencyKey);
  if (existing) {
    return { ok: true, order: existing, idempotentReplay: true };
  }

  const market = getMarket(input.marketId)!;
  const currency = input.currency ?? market.currency;
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  const reservationAttempts: Array<{
    productId: string;
    supplierId: string;
    supplierOfferId: string;
    quantity: number;
    orderId: string;
  }> = [];

  const orderItems: import("./types").OrderItem[] = [];
  const supplierAssignments: import("./types").SupplierAssignmentSnapshot[] = [];
  const itemSnapshots: string[] = [];

  for (const cartItem of input.items) {
    const selection = selectSupplierForOrderItem(
      cartItem.productId,
      input.marketId,
      input._testForceSupplierUnavailable
    );

    if (!selection.ok || !selection.assignment || !selection.offer) {
      return {
        ok: false,
        errorCode: selection.reason === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "SUPPLIER_UNAVAILABLE",
        errorMessage: selection.reason,
      };
    }

    const { snapshot, pricingFailed } = buildItemPriceSnapshot({
      productId: cartItem.productId,
      supplierId: selection.offer.supplierId,
      supplierOfferId: selection.offer.supplierOfferId,
      supplierSku: selection.offer.supplierSku,
      marketId: input.marketId,
      channel: input.channel,
      currency,
      supplierPrice: selection.offer.supplierPrice,
      supplierCurrency: selection.offer.currency,
      stock: selection.offer.stock,
      categoryId: selection.categoryId,
    });

    if (pricingFailed) {
      return { ok: false, errorCode: "PRICING_FAILED", errorMessage: "PRICING_FAILED" };
    }

    itemSnapshots.push(snapshot.snapshotId);
    supplierAssignments.push(selection.assignment);

    reservationAttempts.push({
      productId: cartItem.productId,
      supplierId: selection.offer.supplierId,
      supplierOfferId: selection.offer.supplierOfferId,
      quantity: cartItem.quantity,
      orderId,
    });

    orderItems.push(
      buildOrderItemFromSnapshot(snapshot, {
        orderItemId: `oi_${orderId}_${cartItem.productId}`,
        productName: selection.productName ?? cartItem.productId,
        sku: selection.sku ?? selection.offer.supplierSku,
        ean: selection.ean,
        mpn: selection.mpn,
        quantity: cartItem.quantity,
      })
    );
  }

  const reservationResult = await reserveInventoryForOrder(reservationAttempts);
  if (!reservationResult.ok) {
    return {
      ok: false,
      errorCode: reservationResult.errorCode,
      errorMessage: reservationResult.errorMessage,
    };
  }

  for (let i = 0; i < orderItems.length; i++) {
    orderItems[i] = {
      ...orderItems[i],
      inventoryReservationId: reservationResult.reservationIds[i],
      fulfillmentStatus: "RESERVED",
    };
  }

  const totals = calculateOrderTotals(orderItems, 0);
  const marketChannelSnapshot: MarketChannelSnapshot = {
    marketId: input.marketId,
    country: input.marketId,
    currency,
    channel: input.channel,
    capturedAt: now,
  };

  let order: BuzzardOrder = {
    orderId,
    orderNumber: generateOrderNumber(),
    customerId: input.customerId,
    customerEmail: input.customerEmail,
    marketId: input.marketId,
    channel: input.channel,
    currency,
    status: "PENDING_PAYMENT",
    paymentStatus: "PENDING",
    fulfillmentStatus: "RESERVED",
    items: orderItems,
    subtotalNet: totals.subtotalNet,
    vatAmount: totals.vatAmount,
    shippingAmount: totals.shippingAmount,
    totalGross: totals.totalGross,
    priceSnapshotId: itemSnapshots[0] ?? "",
    reservationIds: reservationResult.reservationIds,
    supplierAssignments,
    supplierOrders: [],
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress ?? input.shippingAddress,
    marketChannelSnapshot,
    returnRefund: createReturnRefundFoundation(),
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };

  emitOrderEvent({ orderId, type: "ORDER_CREATED", source: "order-engine" });
  emitOrderEvent({
    orderId,
    type: "RESERVATION_CREATED",
    source: "inventory-engine",
    metadata: { reservationIds: reservationResult.reservationIds },
  });
  for (const assignment of supplierAssignments) {
    emitOrderEvent({
      orderId,
      type: "SUPPLIER_SELECTED",
      source: "supplier-engine",
      metadata: { supplierId: assignment.supplierId, score: assignment.selectionScore },
    });
  }

  recordOrderAudit({ orderId, actor: "order-engine", action: "ORDER_CREATED" });

  const pendingPayment = createPendingPayment({
    orderId,
    amount: order.totalGross,
    currency,
    method: input.paymentMethod,
  });
  order.payment = pendingPayment;
  emitOrderEvent({ orderId, type: "PAYMENT_PENDING", source: "payment-mock" });

  const authResult = authorizePayment(pendingPayment, input._testPaymentShouldFail);
  if (!authResult.ok || !authResult.payment) {
    rollbackReservations(reservationResult.reservationIds);
    order = {
      ...order,
      status: "FAILED",
      paymentStatus: "FAILED",
      fulfillmentStatus: "FAILED",
      payment: authResult.payment,
      reservationIds: [],
      errorCode: "PAYMENT_FAILED",
      errorMessage: authResult.errorMessage,
      updatedAt: new Date().toISOString(),
    };
    emitOrderEvent({ orderId, type: "PAYMENT_FAILED", source: "payment-mock" });
    emitOrderEvent({
      orderId,
      type: "RESERVATION_RELEASED",
      source: "order-engine",
      metadata: { reason: "PAYMENT_FAILED" },
    });
    recordStatusTransition(orderId, "order-engine", "PENDING_PAYMENT", "FAILED");
    saveOrder(order);
    return { ok: false, order, errorCode: "PAYMENT_FAILED", errorMessage: authResult.errorMessage };
  }

  order.payment = authResult.payment;
  order.paymentStatus = "AUTHORIZED";
  emitOrderEvent({ orderId, type: "PAYMENT_AUTHORIZED", source: "payment-mock" });

  order.payment = capturePayment(authResult.payment);
  order.paymentStatus = "CAPTURED";
  assertOrderTransition(order.status, "PAID");
  order.status = "PAID";
  emitOrderEvent({ orderId, type: "PAYMENT_CAPTURED", source: "payment-mock" });

  assertOrderTransition(order.status, "CONFIRMED");
  order.status = "CONFIRMED";
  emitOrderEvent({ orderId, type: "ORDER_CONFIRMED", source: "order-engine" });
  recordStatusTransition(orderId, "order-engine", "PAID", "CONFIRMED");

  assertOrderTransition(order.status, "PROCESSING");
  order.status = "PROCESSING";

  const primarySupplierId = supplierAssignments[0]?.supplierId;
  const supplierConfig = primarySupplierId ? getSupplier(primarySupplierId) : undefined;
  const tradeRoutePipeline = runTradeRouteFulfillmentPipeline({
    orderId,
    marketId: input.marketId,
    shippingAddress: input.shippingAddress,
    validatedCheckoutCountry: input.validatedCheckoutCountry,
    items: orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      supplierId: item.supplierId,
      lineGross: item.lineGross,
      productName: item.productName,
    })),
    currency,
    supplier: {
      supplierId: supplierConfig?.supplierId ?? primarySupplierId ?? "UNKNOWN",
      country: supplierConfig?.country,
      region: supplierConfig?.region,
      shippingOrigin: input._testSupplierShippingOrigin,
      warehouseCountry: input._testSupplierWarehouseCountry,
      fulfillmentCountry: input._testSupplierFulfillmentCountry,
      supplierCountry: input._testSupplierCountry,
    },
    idempotencyKey: input.idempotencyKey,
    serviceLevel: input.serviceLevel,
    weightKg: input._testParcelWeightKg,
    dimensionsCm: input._testParcelDimensions,
  });

  for (const event of tradeRoutePipeline.events) {
    emitOrderEvent({
      orderId,
      type: event.type as import("./types").OrderEventType,
      source: "trade-route-fulfillment",
      metadata: event.metadata,
    });
  }

  if (tradeRoutePipeline.snapshot) {
    order.tradeRouteFulfillment = tradeRoutePipeline.snapshot;
    if (tradeRoutePipeline.snapshot.shippingCost != null) {
      order.shippingAmount = tradeRoutePipeline.snapshot.shippingCost;
    }
  }

  if (!tradeRoutePipeline.ok) {
    const holdReason = tradeRoutePipeline.snapshot?.holdReason;
    const fulfillmentStatus =
      holdReason === "SHIPPING_HOLD" ? "SHIPPING_HOLD" : "CUSTOMS_HOLD";
    order = {
      ...order,
      fulfillmentStatus,
      errorCode: (tradeRoutePipeline.errorCode ?? "CUSTOMS_HOLD") as import("./types").OrderErrorCode,
      errorMessage: tradeRoutePipeline.errorMessage,
      updatedAt: new Date().toISOString(),
    };
    recordOrderAudit({
      orderId,
      actor: "trade-route-fulfillment",
      action: fulfillmentStatus,
      metadata: {
        holdReason,
        tradeRoute: tradeRoutePipeline.snapshot?.tradeRoute,
        missingFields: tradeRoutePipeline.snapshot?.customsMissingFields,
      },
    });
    saveOrder(order);
    return {
      ok: false,
      order,
      errorCode: order.errorCode,
      errorMessage: order.errorMessage,
    };
  }

  const fulfillment = await prepareSupplierOrders(order);
  if (!fulfillment.ok) {
    rollbackReservations(reservationResult.reservationIds);
    order = {
      ...order,
      status: "FAILED",
      fulfillmentStatus: "FAILED",
      errorCode: "FULFILLMENT_PREPARATION_FAILED",
      errorMessage: fulfillment.errorMessage,
      updatedAt: new Date().toISOString(),
    };
    saveOrder(order);
    return { ok: false, order, errorCode: "FULFILLMENT_PREPARATION_FAILED" };
  }

  order.supplierOrders = fulfillment.supplierOrders;
  for (const so of fulfillment.supplierOrders) {
    emitOrderEvent({
      orderId,
      type: "SUPPLIER_ORDER_PREPARED",
      source: "order-engine",
      metadata: { supplierOrderId: so.supplierOrderId, dryRun: true },
    });
  }

  assertOrderTransition(order.status, "SUPPLIER_PENDING");
  order.status = "SUPPLIER_PENDING";
  order.fulfillmentStatus = "SUPPLIER_PREPARED";
  order.updatedAt = new Date().toISOString();

  saveOrder(order);
  return { ok: true, order };
}
