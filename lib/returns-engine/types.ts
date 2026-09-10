import type { OrderChannel } from "@/lib/order-engine/types";

export type ReturnReason =
  | "CUSTOMER_CHANGED_MIND"
  | "WRONG_SIZE"
  | "WRONG_PRODUCT"
  | "PRODUCT_DAMAGED"
  | "PRODUCT_DEFECTIVE"
  | "PRODUCT_NOT_AS_DESCRIBED"
  | "MISSING_PARTS"
  | "INCORRECT_ITEM_RECEIVED"
  | "DELIVERY_DAMAGE"
  | "SUPPLIER_ERROR"
  | "MARKETPLACE_REASON"
  | "OTHER";

export type ProductCondition =
  | "UNOPENED"
  | "OPENED"
  | "USED"
  | "DAMAGED"
  | "DEFECTIVE"
  | "INCOMPLETE"
  | "WRONG_ITEM"
  | "UNKNOWN";

export type ReturnStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "LABEL_PENDING"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "INSPECTION_PENDING"
  | "INSPECTED"
  | "SUPPLIER_PENDING"
  | "SUPPLIER_ACCEPTED"
  | "SUPPLIER_REJECTED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "REPLACEMENT_PENDING"
  | "REPLACED"
  | "CLOSED"
  | "CANCELLED";

export type EligibilityOutcome = "eligible" | "ineligible" | "reviewRequired";

export type ReturnShippingPayer =
  | "CUSTOMER"
  | "BUZZARD"
  | "SUPPLIER"
  | "MARKETPLACE"
  | "SHARED"
  | "UNKNOWN";

export type SupplierReturnStatus =
  | "NOT_CREATED"
  | "PREPARED"
  | "SUBMITTED"
  | "ACCEPTED"
  | "REJECTED"
  | "PARTIALLY_ACCEPTED"
  | "CLOSED";

export type SupplierRecoveryType =
  | "SUPPLIER_REFUND"
  | "SUPPLIER_CREDIT"
  | "REPLACEMENT"
  | "SHIPPING_CREDIT"
  | "PARTIAL_CREDIT"
  | "NO_RECOVERY";

export type SupplierRecoveryStatus =
  | "REQUESTED"
  | "APPROVED"
  | "RECEIVED"
  | "PARTIALLY_RECEIVED"
  | "REJECTED"
  | "CANCELLED";

export type CustomerRefundStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type MarketplaceRefundStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export type ResponsibilityParty =
  | "CUSTOMER"
  | "BUZZARD"
  | "SUPPLIER"
  | "MARKETPLACE"
  | "CARRIER"
  | "SHARED"
  | "UNKNOWN";

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "PARTIALLY_ACCEPTED"
  | "REJECTED"
  | "CLOSED";

export type ReturnEventType =
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "RETURN_LABEL_CREATED"
  | "RETURN_SHIPPED"
  | "RETURN_RECEIVED"
  | "RETURN_INSPECTION_COMPLETED"
  | "SUPPLIER_RETURN_PREPARED"
  | "SUPPLIER_RETURN_ACCEPTED"
  | "SUPPLIER_RETURN_REJECTED"
  | "SUPPLIER_REFUND_REQUESTED"
  | "SUPPLIER_REFUND_APPROVED"
  | "SUPPLIER_REFUND_RECEIVED"
  | "SUPPLIER_CREDIT_RECEIVED"
  | "CUSTOMER_REFUND_REQUESTED"
  | "CUSTOMER_REFUND_COMPLETED"
  | "MARKETPLACE_REFUND_COMPLETED"
  | "RETURN_CLOSED"
  | "RETURN_DISPUTED";

export type ReturnErrorCode =
  | "ORDER_NOT_FOUND"
  | "UNAUTHORIZED"
  | "INELIGIBLE"
  | "VALIDATION_FAILED"
  | "DUPLICATE_RETURN"
  | "INVALID_TRANSITION"
  | "REFUND_FAILED";

export interface ReturnItem {
  returnItemId: string;
  orderItemId: string;
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  quantity: number;
  reason: ReturnReason;
  condition: ProductCondition;
  inspectionStatus?: string;
  expectedRefundAmount: number;
  approvedRefundAmount?: number;
  supplierRecoveryAmount?: number;
  restockingAmount?: number;
  damageAmount?: number;
  finalBuzzardImpact?: number;
}

export interface ReturnRequest {
  returnId: string;
  returnNumber: string;
  orderId: string;
  customerId: string;
  marketId: string;
  channel: OrderChannel;
  currency: string;
  status: ReturnStatus;
  reason: ReturnReason;
  items: ReturnItem[];
  requestedAt: string;
  approvedAt?: string;
  receivedAt?: string;
  closedAt?: string;
  returnWindowDeadline?: string;
  returnShippingCost: number;
  customerRefundAmount: number;
  supplierRefundAmount: number;
  supplierCreditAmount: number;
  marketplaceRefundAmount: number;
  buzzardLoss: number;
  buzzardRecovery: number;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnAuthorization {
  authorizationNumber: string;
  returnId: string;
  orderId: string;
  customerId: string;
  items: ReturnItem[];
  returnAddress: {
    recipientName: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  deadline: string;
  instructions: string;
  status: ReturnStatus;
  createdAt: string;
}

export interface ReturnShipment {
  returnShipmentId: string;
  returnId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  cost: number;
  currency: string;
  payer: ReturnShippingPayer;
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

export interface ReturnReceipt {
  returnId: string;
  receivedAt: string;
  receivedBy: string;
  packageCondition: ProductCondition;
  items: Array<{
    returnItemId: string;
    expectedQuantity: number;
    receivedQuantity: number;
    itemCondition: ProductCondition;
  }>;
}

export interface SupplierReturnRecord {
  supplierReturnId: string;
  returnId: string;
  supplierId: string;
  supplierOfferId: string;
  items: Array<{ returnItemId: string; quantity: number }>;
  quantity: number;
  status: SupplierReturnStatus;
  submittedAt?: string;
  confirmedAt?: string;
  receivedAt?: string;
  inspectionStatus?: string;
  dryRun: true;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRecovery {
  recoveryId: string;
  returnId: string;
  supplierId: string;
  type: SupplierRecoveryType;
  requestedAmount: number;
  approvedAmount: number;
  receivedAmount: number;
  currency: string;
  status: SupplierRecoveryStatus;
  requestedAt: string;
  approvedAt?: string;
  receivedAt?: string;
  reference?: string;
}

export interface CustomerRefund {
  refundId: string;
  orderId: string;
  returnId: string;
  customerId: string;
  requestedAmount: number;
  approvedAmount: number;
  refundedAmount: number;
  currency: string;
  status: CustomerRefundStatus;
  dryRun: true;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceRefund {
  marketplaceRefundId: string;
  marketplaceId: string;
  marketplaceOrderId?: string;
  orderId: string;
  returnId: string;
  requestedAmount: number;
  approvedAmount: number;
  refundedAmount: number;
  fees: number;
  currency: string;
  status: MarketplaceRefundStatus;
  dryRun: true;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialReconciliation {
  reconciliationId: string;
  returnId: string;
  orderId: string;
  currency: string;
  customerRefund: number;
  returnShippingCost: number;
  marketplaceRefundCost: number;
  otherCosts: number;
  supplierRefund: number;
  supplierCredit: number;
  shippingRecovery: number;
  otherRecoveries: number;
  buzzardFinalReturnImpact: number;
  estimatedReturnCost: number;
  actualReturnCost: number;
  estimatedSupplierRecovery: number;
  actualSupplierRecovery: number;
  estimatedBuzzardImpact: number;
  actualBuzzardImpact: number;
  originalOrderMargin: number;
  returnImpact: number;
  finalOrderContribution: number;
  isFinal: boolean;
  calculatedAt: string;
}

export interface SupplierReturnPolicy {
  supplierId: string;
  returnWindowDays: number;
  acceptsReturns: boolean;
  acceptsDefective: boolean;
  acceptsCustomerChangeOfMind: boolean;
  refundMethod: string;
  restockingFeePercent: number;
  shippingReimbursement: boolean;
  damagePolicy: string;
  requiredEvidence: string[];
}

export interface ReturnDispute {
  disputeId: string;
  returnId: string;
  supplierId: string;
  reason: string;
  requestedAmount: number;
  evidence: string[];
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnWebhookEvent {
  eventId: string;
  provider: string;
  eventType: string;
  payloadHash: string;
  returnId?: string;
  receivedAt: string;
  processedAt?: string;
  status: "RECEIVED" | "PROCESSED" | "DUPLICATE" | "FAILED";
}

export interface EligibilityResult {
  outcome: EligibilityOutcome;
  reasonCode: string;
  returnWindowDays?: number;
  returnWindowDeadline?: string;
}

export interface CreateReturnInput {
  orderId: string;
  customerId: string;
  reason: ReturnReason;
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason?: ReturnReason;
    condition?: ProductCondition;
  }>;
  idempotencyKey: string;
}

export interface CreateReturnResult {
  ok: boolean;
  returnRequest?: ReturnRequest;
  eligibility?: EligibilityResult;
  idempotentReplay?: boolean;
  errorCode?: ReturnErrorCode;
  errorMessage?: string;
}

export interface ReturnEvent {
  eventId: string;
  returnId: string;
  type: ReturnEventType;
  timestamp: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface ReturnAuditEntry {
  auditId: string;
  returnId: string;
  actor: string;
  action: string;
  oldStatus?: ReturnStatus;
  newStatus?: ReturnStatus;
  amount?: number;
  currency?: string;
  supplierId?: string;
  timestamp: string;
}

export interface ReturnsEngineAdminRow {
  returnId: string;
  returnNumber: string;
  orderId: string;
  customerId: string;
  marketId: string;
  channel: OrderChannel;
  reason: ReturnReason;
  status: ReturnStatus;
  customerRefund: number;
  supplierRecovery: number;
  returnShipping: number;
  marketplaceRefund: number;
  buzzardImpact: number;
  supplierId: string;
  hasDispute: boolean;
  createdAt: string;
}

export interface CustomerReturnView {
  returnId: string;
  returnNumber: string;
  orderId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  items: Array<{ productId: string; quantity: number }>;
  refundStatus?: CustomerRefundStatus;
  refundAmount?: number;
  currency: string;
  trackingNumber?: string;
  instructions?: string;
  requestedAt: string;
}
