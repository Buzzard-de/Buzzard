import type {
  CustomerRefund,
  FinancialReconciliation,
  MarketplaceRefund,
  ReturnAuthorization,
  ReturnDispute,
  ReturnReceipt,
  ReturnRequest,
  ReturnShipment,
  ReturnWebhookEvent,
  SupplierRecovery,
  SupplierReturnPolicy,
  SupplierReturnRecord,
} from "./types";

const returns = new Map<string, ReturnRequest>();
const returnsByNumber = new Map<string, string>();
const returnsByOrder = new Map<string, string>();
const returnsByCustomer = new Map<string, Set<string>>();
const idempotencyIndex = new Map<string, string>();
const authorizations = new Map<string, ReturnAuthorization>();
const shipments = new Map<string, ReturnShipment>();
const receipts = new Map<string, ReturnReceipt>();
const supplierReturns = new Map<string, SupplierReturnRecord>();
const recoveries = new Map<string, SupplierRecovery>();
const customerRefunds = new Map<string, CustomerRefund>();
const marketplaceRefunds = new Map<string, MarketplaceRefund>();
const reconciliations = new Map<string, FinancialReconciliation>();
const disputes = new Map<string, ReturnDispute>();
const webhookEvents = new Map<string, ReturnWebhookEvent>();
const supplierPolicies = new Map<string, SupplierReturnPolicy>();

let returnCounter = 0;
let authCounter = 0;

export function generateReturnId(): string {
  return `ret_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateReturnNumber(): string {
  returnCounter += 1;
  const year = new Date().getFullYear();
  return `BZ-RET-${year}-${String(returnCounter).padStart(6, "0")}`;
}

export function generateAuthorizationNumber(): string {
  authCounter += 1;
  const year = new Date().getFullYear();
  return `BZ-RET-AUTH-${year}-${String(authCounter).padStart(6, "0")}`;
}

export function saveReturnRequest(record: ReturnRequest): void {
  returns.set(record.returnId, record);
  returnsByNumber.set(record.returnNumber, record.returnId);
  returnsByOrder.set(record.orderId, record.returnId);
  if (!returnsByCustomer.has(record.customerId)) {
    returnsByCustomer.set(record.customerId, new Set());
  }
  returnsByCustomer.get(record.customerId)!.add(record.returnId);
  if (record.idempotencyKey) {
    idempotencyIndex.set(record.idempotencyKey, record.returnId);
  }
}

export function getReturnRequest(returnId: string): ReturnRequest | undefined {
  return returns.get(returnId);
}

export function getReturnByNumber(returnNumber: string): ReturnRequest | undefined {
  const id = returnsByNumber.get(returnNumber);
  return id ? returns.get(id) : undefined;
}

export function getReturnByOrder(orderId: string): ReturnRequest | undefined {
  const id = returnsByOrder.get(orderId);
  return id ? returns.get(id) : undefined;
}

export function getReturnByIdempotencyKey(key: string): ReturnRequest | undefined {
  const id = idempotencyIndex.get(key);
  return id ? returns.get(id) : undefined;
}

export function getReturnsByCustomer(customerId: string): ReturnRequest[] {
  const ids = returnsByCustomer.get(customerId);
  if (!ids) return [];
  return [...ids].map((id) => returns.get(id)!).filter(Boolean);
}

export function listAllReturns(): ReturnRequest[] {
  return [...returns.values()];
}

export function saveAuthorization(auth: ReturnAuthorization): void {
  authorizations.set(auth.authorizationNumber, auth);
}

export function getAuthorization(returnId: string): ReturnAuthorization | undefined {
  return [...authorizations.values()].find((a) => a.returnId === returnId);
}

export function saveReturnShipment(shipment: ReturnShipment): void {
  shipments.set(shipment.returnShipmentId, shipment);
}

export function getReturnShipment(returnShipmentId: string): ReturnShipment | undefined {
  return shipments.get(returnShipmentId);
}

export function getShipmentsForReturn(returnId: string): ReturnShipment[] {
  return [...shipments.values()].filter((s) => s.returnId === returnId);
}

export function saveReturnReceipt(receipt: ReturnReceipt): void {
  receipts.set(receipt.returnId, receipt);
}

export function getReturnReceipt(returnId: string): ReturnReceipt | undefined {
  return receipts.get(returnId);
}

export function saveSupplierReturn(record: SupplierReturnRecord): void {
  supplierReturns.set(record.supplierReturnId, record);
}

export function getSupplierReturn(supplierReturnId: string): SupplierReturnRecord | undefined {
  return supplierReturns.get(supplierReturnId);
}

export function getSupplierReturnsForReturn(returnId: string): SupplierReturnRecord[] {
  return [...supplierReturns.values()].filter((r) => r.returnId === returnId);
}

export function saveSupplierRecovery(recovery: SupplierRecovery): void {
  recoveries.set(recovery.recoveryId, recovery);
}

export function getSupplierRecovery(recoveryId: string): SupplierRecovery | undefined {
  return recoveries.get(recoveryId);
}

export function getRecoveriesForReturn(returnId: string): SupplierRecovery[] {
  return [...recoveries.values()].filter((r) => r.returnId === returnId);
}

export function saveCustomerRefund(refund: CustomerRefund): void {
  customerRefunds.set(refund.refundId, refund);
}

export function getCustomerRefund(refundId: string): CustomerRefund | undefined {
  return customerRefunds.get(refundId);
}

export function getCustomerRefundForReturn(returnId: string): CustomerRefund | undefined {
  return [...customerRefunds.values()].find((r) => r.returnId === returnId);
}

export function saveMarketplaceRefund(refund: MarketplaceRefund): void {
  marketplaceRefunds.set(refund.marketplaceRefundId, refund);
}

export function getMarketplaceRefundForReturn(returnId: string): MarketplaceRefund | undefined {
  return [...marketplaceRefunds.values()].find((r) => r.returnId === returnId);
}

export function saveReconciliation(rec: FinancialReconciliation): void {
  reconciliations.set(rec.reconciliationId, rec);
}

export function getReconciliation(returnId: string): FinancialReconciliation | undefined {
  return [...reconciliations.values()].find((r) => r.returnId === returnId);
}

export function saveDispute(dispute: ReturnDispute): void {
  disputes.set(dispute.disputeId, dispute);
}

export function getDisputesForReturn(returnId: string): ReturnDispute[] {
  return [...disputes.values()].filter((d) => d.returnId === returnId);
}

export function saveWebhookEvent(event: ReturnWebhookEvent): void {
  webhookEvents.set(event.eventId, event);
}

export function getWebhookByHash(provider: string, payloadHash: string): ReturnWebhookEvent | undefined {
  return [...webhookEvents.values()].find(
    (e) => e.provider === provider && e.payloadHash === payloadHash
  );
}

export function setSupplierPolicy(policy: SupplierReturnPolicy): void {
  supplierPolicies.set(policy.supplierId, policy);
}

export function getSupplierPolicy(supplierId: string): SupplierReturnPolicy | undefined {
  return supplierPolicies.get(supplierId);
}

export function clearReturnsRegistry(): void {
  returns.clear();
  returnsByNumber.clear();
  returnsByOrder.clear();
  returnsByCustomer.clear();
  idempotencyIndex.clear();
  authorizations.clear();
  shipments.clear();
  receipts.clear();
  supplierReturns.clear();
  recoveries.clear();
  customerRefunds.clear();
  marketplaceRefunds.clear();
  reconciliations.clear();
  disputes.clear();
  webhookEvents.clear();
  supplierPolicies.clear();
  returnCounter = 0;
  authCounter = 0;
}
