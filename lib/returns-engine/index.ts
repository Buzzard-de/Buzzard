export type {
  CreateReturnInput,
  CreateReturnResult,
  CustomerRefund,
  CustomerReturnView,
  EligibilityResult,
  FinancialReconciliation,
  MarketplaceRefund,
  ProductCondition,
  ReturnAuditEntry,
  ReturnAuthorization,
  ReturnDispute,
  ReturnEvent,
  ReturnEventType,
  ReturnItem,
  ReturnReason,
  ReturnReceipt,
  ReturnRequest,
  ReturnShipment,
  ReturnStatus,
  ReturnsEngineAdminRow,
  ResponsibilityParty,
  SupplierRecovery,
  SupplierRecoveryType,
  SupplierReturnPolicy,
  SupplierReturnRecord,
} from "./types";

export {
  getReturnRequest,
  getReturnByNumber,
  getReturnByOrder,
  getReturnsByCustomer,
  listAllReturns,
  getSupplierPolicy,
  setSupplierPolicy,
  clearReturnsRegistry,
} from "./registry";

export {
  canTransitionReturnStatus,
  assertReturnTransition,
  transitionReturnStatus,
} from "./status";

export { evaluateReturnEligibility, setReturnWindowConfig, getReturnWindowDays } from "./eligibility";
export {
  createReturnRequest,
  approveReturn,
  rejectReturn,
} from "./request";
export { createReturnAuthorization } from "./authorization";
export { createReturnShipment, getReturnShippingFinancials } from "./shipment";
export { recordReturnReceipt, completeReturnInspection } from "./receipt";
export {
  prepareSupplierReturn,
  acceptSupplierReturn,
  rejectSupplierReturn,
} from "./supplierReturn";
export {
  recordSupplierRecovery,
  calculatePartialRecoveryGap,
} from "./supplierCredit";
export { requestCustomerRefund, processCustomerRefund } from "./refund";
export { importMarketplaceReturn, recordMarketplaceRefund } from "./marketplace";
export { reconcileReturnFinancials, getReconciliation } from "./reconciliation";
export { getFinalOrderContribution, documentEstimatedVsActual } from "./financialImpact";
export {
  emitReturnEvent,
  getReturnEvents,
  clearReturnEvents,
  receiveReturnWebhook,
  hashReturnWebhookPayload,
} from "./events";
export { recordReturnAudit, getReturnAuditLog, clearReturnAuditLog } from "./audit";
export {
  rejectClientReturnModification,
  canCustomerAccessReturn,
  sanitizeClientReturnPatch,
} from "./security";
export {
  buildReturnAdminRow,
  getReturnsAdminOverview,
  getReturnAdminDetail,
  openReturnDispute,
  closeReturn,
} from "./admin";
export {
  getCustomerReturn,
  listCustomerReturns,
  toCustomerReturnView,
  evaluateReturnInventoryOutcome,
} from "./customerView";
export {
  seedReturnsEngineFixtures,
  createDeliveredOrder,
  buildReturnInput,
  FIXTURE_PRODUCTS,
  TEST_SUPPLIER_POLICY_FULL,
  TEST_SUPPLIER_POLICY_NO_RECOVERY,
  TEST_SUPPLIER_POLICY_PARTIAL,
  TEST_SUPPLIER_ID,
  TEST_CUSTOMER_A,
  TEST_CUSTOMER_B,
} from "./test-fixtures";
