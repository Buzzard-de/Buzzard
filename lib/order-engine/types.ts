import type { PricingChannel } from "@/lib/pricing-engine/types";
import type { VatContext } from "@/lib/market-engine/types";

export type OrderChannel = PricingChannel;

export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "PROCESSING"
  | "SUPPLIER_PENDING"
  | "SUPPLIER_CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "FAILED";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type FulfillmentStatus =
  | "NOT_STARTED"
  | "RESERVED"
  | "CUSTOMS_HOLD"
  | "SHIPPING_HOLD"
  | "SUPPLIER_PREPARED"
  | "SUPPLIER_SUBMITTED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

export type SupplierOrderStatus =
  | "NOT_CREATED"
  | "PREPARED"
  | "SUBMITTED"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "SHIPPED"
  | "DELIVERED"
  | "FAILED";

export type ReturnStatus = "NONE" | "REQUESTED" | "APPROVED" | "RECEIVED" | "REJECTED" | "CLOSED";

export type RefundStatus = "NONE" | "REQUESTED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";

export type OrderEventType =
  | "ORDER_CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_FAILED"
  | "ORDER_CONFIRMED"
  | "RESERVATION_CREATED"
  | "RESERVATION_RELEASED"
  | "SUPPLIER_SELECTED"
  | "TARGET_COUNTRY_RESOLVED"
  | "COUNTRY_MISMATCH"
  | "FULFILLMENT_ORIGIN_RESOLVED"
  | "TRADE_ROUTE_CLASSIFIED"
  | "CUSTOMS_PRECHECK_STARTED"
  | "CUSTOMS_NOT_REQUIRED"
  | "CUSTOMS_READY"
  | "CUSTOMS_REVIEW_REQUIRED"
  | "CUSTOMS_BLOCKED"
  | "CUSTOMS_HOLD"
  | "SHIPPING_QUOTED"
  | "CARRIER_SELECTED"
  | "SHIPPING_HOLD"
  | "TRACKING_ATTACHED"
  | "SUPPLIER_ORDER_PREPARED"
  | "SUPPLIER_ORDER_SUBMITTED"
  | "SUPPLIER_ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "RETURN_REQUESTED"
  | "REFUND_REQUESTED"
  | "REFUND_COMPLETED"
  | "ORDER_FAILED";

export type OrderErrorCode =
  | "OUT_OF_STOCK"
  | "RESERVATION_FAILED"
  | "PAYMENT_FAILED"
  | "SUPPLIER_UNAVAILABLE"
  | "PRICING_FAILED"
  | "ORDER_CREATION_FAILED"
  | "FULFILLMENT_PREPARATION_FAILED"
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "IDEMPOTENCY_CONFLICT"
  | "TRADE_ROUTE_COUNTRY_MISMATCH"
  | "ORIGIN_UNKNOWN"
  | "TRADE_ROUTE_UNKNOWN"
  | "CUSTOMS_HOLD"
  | "SHIPPING_HOLD"
  | "INVALID_COUNTRY";

export interface AddressSnapshot {
  recipientName: string;
  company?: string;
  street: string;
  houseNumber?: string;
  postalCode: string;
  city: string;
  state?: string;
  country: string;
  phone?: string;
}

export interface MarketChannelSnapshot {
  marketId: string;
  country: string;
  currency: string;
  channel: OrderChannel;
  capturedAt: string;
}

/** Immutable per-item price snapshot at order time. */
export interface OrderItemPriceSnapshot {
  snapshotId: string;
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  marketId: string;
  channel: OrderChannel;
  currency: string;
  supplierCost: number;
  shippingCost: number;
  marketplaceFee: number;
  paymentFee: number;
  returnCostReserve: number;
  refundCostReserve: number;
  targetMarginPercent: number;
  customerNetPrice: number;
  customerVat: number;
  customerGrossPrice: number;
  actualMargin: number;
  taxContext: VatContext;
  calculatedAt: string;
  capturedAt: string;
}

export interface SupplierAssignmentSnapshot {
  supplierId: string;
  supplierOfferId: string;
  supplierSku: string;
  supplierCost: number;
  supplierCurrency: string;
  selectionScore: number;
  selectionReasons: string[];
  shippingRoute?: string;
  expectedDeliveryDays?: number;
  selectedAt: string;
}

export interface SupplierOrderRecord {
  supplierOrderId: string;
  orderId: string;
  supplierId: string;
  status: SupplierOrderStatus;
  dryRun: true;
  items: Array<{
    productId: string;
    supplierSku: string;
    quantity: number;
    supplierCost: number;
  }>;
  shippingAddress: AddressSnapshot;
  preparedAt?: string;
  message?: string;
}

export interface OrderItem {
  orderItemId: string;
  productId: string;
  supplierOfferId: string;
  supplierId: string;
  sku: string;
  ean?: string;
  mpn?: string;
  productName: string;
  quantity: number;
  unitNetPrice: number;
  unitVat: number;
  unitGrossPrice: number;
  lineNet: number;
  lineVat: number;
  lineGross: number;
  priceSnapshotId: string;
  inventoryReservationId?: string;
  supplierCostSnapshot: number;
  shippingCostSnapshot: number;
  marketplaceFeeSnapshot: number;
  paymentFeeSnapshot: number;
  returnReserveSnapshot: number;
  marginSnapshot: number;
  fulfillmentStatus: FulfillmentStatus;
}

export interface PaymentRecord {
  paymentId: string;
  orderId: string;
  provider: string;
  method: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dryRun: true;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRefundFoundation {
  returnStatus: ReturnStatus;
  refundStatus: RefundStatus;
  refundAmount: number;
  supplierRefundAmount: number;
  supplierCreditAmount: number;
  returnShippingCost: number;
  buzzardRefundLoss: number;
}

export interface OrderTrackingView {
  carrier?: string;
  trackingNumber?: string;
  shipmentId?: string;
  status: "NOT_ATTACHED" | "ATTACHED" | "BLOCKED";
  trackingStatus?: string;
  estimatedDelivery?: string;
}

export interface BuzzardOrder {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  marketId: string;
  channel: OrderChannel;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItem[];
  subtotalNet: number;
  vatAmount: number;
  shippingAmount: number;
  totalGross: number;
  priceSnapshotId: string;
  reservationIds: string[];
  supplierAssignments: SupplierAssignmentSnapshot[];
  supplierOrders: SupplierOrderRecord[];
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  marketChannelSnapshot: MarketChannelSnapshot;
  payment?: PaymentRecord;
  returnRefund: ReturnRefundFoundation;
  tradeRouteFulfillment?: import("@/lib/trade-route-fulfillment/types").TradeRouteFulfillmentSnapshot;
  tracking?: OrderTrackingView;
  idempotencyKey?: string;
  errorCode?: OrderErrorCode;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  customerEmail: string;
  marketId: string;
  channel: OrderChannel;
  currency?: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: AddressSnapshot;
  billingAddress?: AddressSnapshot;
  idempotencyKey: string;
  paymentMethod?: string;
  /** Test-only — simulate payment failure */
  _testPaymentShouldFail?: boolean;
  /** Test-only — simulate supplier selection failure */
  _testForceSupplierUnavailable?: boolean;
  /** Checkout-validated destination country (server authoritative) */
  validatedCheckoutCountry?: string;
  serviceLevel?: string;
  /** Test-only supplier origin overrides */
  _testSupplierCountry?: string;
  _testSupplierShippingOrigin?: string;
  _testSupplierWarehouseCountry?: string;
  _testSupplierFulfillmentCountry?: string;
  _testParcelWeightKg?: number;
  _testParcelDimensions?: { length: number; width: number; height: number };
}

export interface CreateOrderResult {
  ok: boolean;
  order?: BuzzardOrder;
  errorCode?: OrderErrorCode;
  errorMessage?: string;
  idempotentReplay?: boolean;
}

export interface OrderEvent {
  eventId: string;
  orderId: string;
  type: OrderEventType;
  timestamp: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface OrderAuditEntry {
  auditId: string;
  orderId: string;
  actor: string;
  action: string;
  timestamp: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  supplierId?: string;
  reservationId?: string;
  paymentId?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerOrderView {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  totalGross: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitGrossPrice: number;
    lineGross: number;
  }>;
  shippingAddress: Pick<AddressSnapshot, "recipientName" | "city" | "country" | "postalCode">;
  shippingMethod?: string;
  carrier?: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  trackingStatus?: string;
}

export interface OrderEngineAdminRow {
  orderNumber: string;
  customerId: string;
  marketId: string;
  channel: OrderChannel;
  itemCount: number;
  totalGross: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  supplierId: string;
  supplierOrderStatus: SupplierOrderStatus;
  reservationCount: number;
  fulfillmentStatus: FulfillmentStatus;
  originCountry: string;
  destinationCountry: string;
  tradeRoute: string;
  customsStatus: string;
  customsMissingFields: string;
  carrierOptions: string;
  selectedCarrier: string;
  shippingStatus: string;
  trackingStatus: string;
  holdReason: string;
  returnStatus: ReturnStatus;
  refundStatus: RefundStatus;
  createdAt: string;
  updatedAt: string;
}
