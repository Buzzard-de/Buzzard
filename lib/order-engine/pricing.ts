import { calculatePrice } from "@/lib/pricing-engine/price";
import { roundMoney } from "@/lib/market-engine/money";
import type { PricingChannel } from "@/lib/pricing-engine/types";
import type { OrderItem, OrderItemPriceSnapshot } from "./types";
import { savePriceSnapshot } from "./registry";

export function buildItemPriceSnapshot(options: {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  supplierSku: string;
  marketId: string;
  channel: PricingChannel;
  currency: string;
  supplierPrice: number;
  supplierCurrency: string;
  stock: number;
  categoryId?: string;
}): { snapshot: OrderItemPriceSnapshot; pricingFailed: boolean } {
  const result = calculatePrice({
    productId: options.productId,
    supplierId: options.supplierId,
    supplierOfferId: options.supplierOfferId,
    marketId: options.marketId,
    channel: options.channel,
    currency: options.currency,
    categoryId: options.categoryId,
    supplierOffer: {
      supplierPrice: options.supplierPrice,
      currency: options.supplierCurrency,
      stock: options.stock,
      lastUpdated: new Date().toISOString(),
      supplierSku: options.supplierSku,
    },
  });

  if (result.pricingStatus !== "VALID") {
    return { snapshot: null as unknown as OrderItemPriceSnapshot, pricingFailed: true };
  }

  const snapshot: OrderItemPriceSnapshot = {
    snapshotId: `ordprice_${options.productId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    productId: options.productId,
    supplierId: options.supplierId,
    supplierOfferId: options.supplierOfferId,
    marketId: options.marketId,
    channel: options.channel,
    currency: result.currency,
    supplierCost: result.supplierNetPrice,
    shippingCost: result.shippingCost,
    marketplaceFee: result.marketplaceFee,
    paymentFee: result.paymentFee,
    returnCostReserve: result.returnCostReserve,
    refundCostReserve: result.refundCostReserve,
    targetMarginPercent: result.targetMarginPercent,
    customerNetPrice: result.customerNetPrice,
    customerVat: result.customerVat,
    customerGrossPrice: result.customerGrossPrice,
    actualMargin: result.buzzardContributionMargin,
    taxContext: result.taxContext,
    calculatedAt: result.calculatedAt,
    capturedAt: new Date().toISOString(),
  };

  savePriceSnapshot(snapshot);
  return { snapshot, pricingFailed: false };
}

export function buildOrderItemFromSnapshot(
  snapshot: OrderItemPriceSnapshot,
  options: {
    orderItemId: string;
    productName: string;
    sku: string;
    ean?: string;
    mpn?: string;
    quantity: number;
    reservationId?: string;
  }
): OrderItem {
  const qty = options.quantity;
  const unitNet = snapshot.customerNetPrice;
  const unitVat = snapshot.customerVat;
  const unitGross = snapshot.customerGrossPrice;

  return {
    orderItemId: options.orderItemId,
    productId: snapshot.productId,
    supplierOfferId: snapshot.supplierOfferId,
    supplierId: snapshot.supplierId,
    sku: options.sku,
    ean: options.ean,
    mpn: options.mpn,
    productName: options.productName,
    quantity: qty,
    unitNetPrice: unitNet,
    unitVat: unitVat,
    unitGrossPrice: unitGross,
    lineNet: roundMoney(unitNet * qty),
    lineVat: roundMoney(unitVat * qty),
    lineGross: roundMoney(unitGross * qty),
    priceSnapshotId: snapshot.snapshotId,
    inventoryReservationId: options.reservationId,
    supplierCostSnapshot: snapshot.supplierCost,
    shippingCostSnapshot: snapshot.shippingCost,
    marketplaceFeeSnapshot: snapshot.marketplaceFee,
    paymentFeeSnapshot: snapshot.paymentFee,
    returnReserveSnapshot: roundMoney(snapshot.returnCostReserve + snapshot.refundCostReserve),
    marginSnapshot: snapshot.actualMargin,
    fulfillmentStatus: "NOT_STARTED",
  };
}

export function calculateOrderTotals(items: OrderItem[], shippingAmount = 0): {
  subtotalNet: number;
  vatAmount: number;
  shippingAmount: number;
  totalGross: number;
} {
  const subtotalNet = roundMoney(items.reduce((sum, i) => sum + i.lineNet, 0));
  const vatAmount = roundMoney(items.reduce((sum, i) => sum + i.lineVat, 0));
  const itemsGross = roundMoney(items.reduce((sum, i) => sum + i.lineGross, 0));
  const totalGross = roundMoney(itemsGross + shippingAmount);
  return { subtotalNet, vatAmount, shippingAmount, totalGross };
}
