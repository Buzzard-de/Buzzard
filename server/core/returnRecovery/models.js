/**
 * Return & Recovery data shapes (embedded in return_recovery_cases.case_json).
 * Uses existing SQLite store — no parallel persistence engine.
 */

/** @typedef {Object} ReturnItem */
/** @property {string} orderLineId */
/** @property {string} [productId] */
/** @property {string} [sku] */
/** @property {number} quantity */
/** @property {number} unitPrice */
/** @property {string} [currency] */

/** @typedef {Object} ReturnEvidence */
/** @property {string} id */
/** @property {"customer_photo"|"package_photo"|"product_photo"|"shipping_damage"|"supplier_correspondence"|"carrier_evidence"|"invoice"|"credit_note"|"tracking"} type */
/** @property {string} [reference] */
/** @property {string} [uri] */

/** @typedef {Object} ReturnInspection */
/** @property {string} condition */
/** @property {string} packagingCondition */
/** @property {boolean} productComplete */
/** @property {boolean} serialNumberVerified */
/** @property {boolean} accessoriesComplete */
/** @property {boolean} damageFound */
/** @property {boolean} resellable */
/** @property {string} inspectionNotes */
/** @property {string|null} inspectedBy */
/** @property {string} inspectedAt */
/** @property {string} inspectionStatus */

/** @typedef {Object} RefundInstruction */
/** @property {string} returnCaseId */
/** @property {number} amount */
/** @property {string} currency */
/** @property {"BLOCKED"|"READY"} execution */
/** @property {string} [reason] */
/** @property {string} [paymentLayer] */

/** @typedef {Object} SupplierRecoveryClaim */
/** @property {string|null} supplierId */
/** @property {string|null} supplierOrderId */
/** @property {string|null} productId */
/** @property {string} reason */
/** @property {string} liability */
/** @property {number} requestedRefund */
/** @property {number} requestedCredit */
/** @property {number} shippingRecovery */
/** @property {string[]} evidenceReferences */
/** @property {string} status */
/** @property {boolean} diagnosticOnly */

/** @typedef {Object} SupplierRecoveryEvent */
/** @property {string} id */
/** @property {"REFUND"|"CREDIT_NOTE"} type */
/** @property {number} requestedAmount */
/** @property {number} confirmedAmount */
/** @property {string} currency */
/** @property {string|null} reference */
/** @property {string} status */
/** @property {string} [idempotencyKey] */

/** @typedef {Object} CreditNote */
/** @property {boolean} creditNoteRequested */
/** @property {string} creditNoteNumber */
/** @property {number} creditNoteAmount */
/** @property {string} creditNoteCurrency */
/** @property {string} creditNoteDate */
/** @property {string} creditNoteStatus */
/** @property {boolean} verified */

/** @typedef {Object} ReturnReconciliation */
/** @property {number} customerRefund */
/** @property {number} supplierRecoveryExpected */
/** @property {number} supplierRecoveryConfirmed */
/** @property {number} unrecoveredAmount */
/** @property {number} buzzardNetImpact */
/** @property {string} currency */
/** @property {string} status */

/** @typedef {Object} ReturnCase */
/** @property {string} id */
/** @property {string} status */
/** @property {string} orderId */
/** @property {string} orderLineId */
/** @property {ReturnItem[]} [items] */
/** @property {number} customerRefundAmount */
/** @property {number} supplierRefundAmount */
/** @property {number} supplierCreditAmount */
/** @property {number} unrecoveredAmount */
/** @property {number} customerShippingRefund */
/** @property {number} supplierShippingRecovery */
/** @property {number} returnShippingCost */
/** @property {number} supplierReturnShippingRecovery */
/** @property {number} inspectionCost */
/** @property {number} restockingCost */
/** @property {number} paymentFee */
/** @property {string} supplierLiability */
/** @property {string} buzzardLiability */
/** @property {string} customerLiability */
/** @property {ReturnInspection} [inspection] */
/** @property {ReturnEvidence[]} evidence */
/** @property {RefundInstruction} [refundInstruction] */
/** @property {SupplierRecoveryClaim} [supplierClaim] */
/** @property {SupplierRecoveryEvent[]} supplierRecoveryEvents */
/** @property {CreditNote[]} creditNotes */
/** @property {ReturnReconciliation} [reconciliation] */

module.exports = {};
