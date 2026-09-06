const {
  RETURN_STATES,
  STATE_TRANSITIONS,
  SUPPLIER_RECOVERY_EVENT_TYPES,
  CREDIT_NOTE_STATUS,
  SUPPLIER_RECOVERY_STATUS,
} = require("./constants");
const { ERROR_CODES, createReturnRecoveryError } = require("./errors");
const { applyLiabilityToCase } = require("./liabilityEngine");
const { calculateCustomerRefund } = require("./customerRefundEngine");
const { calculateSupplierRecovery } = require("./supplierRecoveryEngine");
const { reconcileReturn } = require("./reconciliationEngine");
const { normalizeInspection, validateInspectionRequired } = require("./inspectionEngine");
const { assertRefundExecutionAllowed, assertSupplierLiveAllowed } = require("./safetyGates");
const { recordReturnAudit, AUDIT_ACTIONS } = require("./audit");
const store = require("./store");

function assertTransition(current, next) {
  const allowed = STATE_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw createReturnRecoveryError(
      ERROR_CODES.RETURN_INVALID_STATE,
      `Invalid state transition ${current} -> ${next}`
    );
  }
}

function transitionCase(returnCase, nextStatus) {
  assertTransition(returnCase.status, nextStatus);
  return { ...returnCase, status: nextStatus };
}

function withReconciliation(returnCase) {
  const reconciliation = reconcileReturn(returnCase);
  return {
    ...returnCase,
    reconciliation,
    supplierRecoveryConfirmed: reconciliation.supplierRecoveryConfirmed,
    supplierRecoveryExpected:
      returnCase.supplierRecoveryExpected ?? reconciliation.supplierRecoveryExpected,
    unrecoveredAmount: reconciliation.unrecoveredAmount,
    buzzardNetImpact: reconciliation.buzzardNetImpact,
    supplierRecoveryStatus:
      returnCase.supplierRecoveryStatus ?? reconciliation.supplierRecoveryStatus,
  };
}

function requireIdempotencyKey(key) {
  if (!key) {
    throw createReturnRecoveryError(
      ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
      "Idempotency-Key required"
    );
  }
}

function withIdempotency(scope, key, handler) {
  requireIdempotencyKey(key);
  const existing = store.getIdempotentResponse(scope, key);
  if (existing) {
    return { ...existing, idempotencyReplay: true };
  }
  const result = handler();
  store.storeIdempotentResponse(scope, key, result);
  return result;
}

function createReturnCase(body = {}, { idempotencyKey, actor = "system" } = {}) {
  return withIdempotency("return_create", idempotencyKey, () => {
    const orderId = body.orderId || body.order_id;
    const orderLineId = body.orderLineId || body.order_line_id;
    if (!orderId || !orderLineId) {
      throw createReturnRecoveryError(
        ERROR_CODES.RETURN_INVALID_STATE,
        "orderId and orderLineId required"
      );
    }

    const duplicateKey = `RETURN:${orderId}:${orderLineId}`;
    const existingByLine = store.findByOrderLine(orderId, orderLineId);
    if (existingByLine && existingByLine.status !== RETURN_STATES.CANCELLED) {
      throw createReturnRecoveryError(
        ERROR_CODES.RETURN_ALREADY_EXISTS,
        "Return case already exists for order line",
        { existingId: existingByLine.id }
      );
    }

    if (idempotencyKey) {
      const existing = store.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    const now = new Date().toISOString();
    let returnCase = applyLiabilityToCase({
      id: store.newCaseId(),
      idempotencyKey: idempotencyKey || duplicateKey,
      status: RETURN_STATES.REQUESTED,
      orderId,
      orderLineId,
      productId: body.productId || body.product_id || null,
      supplierOrderId: body.supplierOrderId || body.supplier_order_id || null,
      supplierId: body.supplierId || body.supplier_id || null,
      shipmentId: body.shipmentId || body.shipment_id || null,
      trackingNumber: body.trackingNumber || body.tracking_number || null,
      reason: String(body.reason || "OTHER").toUpperCase(),
      currency: body.currency || "EUR",
      unitPrice: Number(body.unitPrice || body.unit_price || 0),
      quantity: Number(body.quantity || 1),
      customerShippingRefund: Number(body.customerShippingRefund || 0),
      supplierShippingRecovery: Number(body.supplierShippingRecovery || 0),
      supplierReturnShippingRecovery: Number(body.supplierReturnShippingRecovery || 0),
      returnShippingCost: Number(body.returnShippingCost || 0),
      returnShippingPaidBy: body.returnShippingPaidBy || "UNKNOWN",
      returnLabelRequired: Boolean(body.returnLabelRequired),
      returnLabelProvider: body.returnLabelProvider || null,
      returnTrackingNumber: body.returnTrackingNumber || null,
      deductionAmount: Number(body.deductionAmount || 0),
      inspectionCost: Number(body.inspectionCost || 0),
      restockingCost: Number(body.restockingCost || 0),
      paymentFee: Number(body.paymentFee || 0),
      evidence: body.evidence || [],
      supplierRecoveryEvents: [],
      creditNotes: [],
      customerRefundAmount: 0,
      createdAt: now,
      updatedAt: now,
      lastAction: "RETURN_CREATED",
    });

    const supplierRecovery = calculateSupplierRecovery(returnCase);
    returnCase = {
      ...returnCase,
      supplierRecoveryExpected: supplierRecovery.totalExpectedRecovery,
      supplierRecoveryStatus: supplierRecovery.status,
    };

    returnCase = withReconciliation(returnCase);
    store.saveCase(returnCase);
    recordReturnAudit({
      action: AUDIT_ACTIONS.RETURN_CREATED,
      returnCaseId: returnCase.id,
      actor,
      metadata: { orderId, orderLineId, reason: returnCase.reason },
    });
    return returnCase;
  });
}

function approveReturn(id, { actor = "system" } = {}) {
  const returnCase = store.getCaseById(id);
  if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

  let updated = transitionCase(returnCase, RETURN_STATES.APPROVED);
  updated.lastAction = "RETURN_APPROVED";
  updated = withReconciliation(updated);
  store.saveCase(updated);
  recordReturnAudit({ action: AUDIT_ACTIONS.RETURN_APPROVED, returnCaseId: id, actor });
  return updated;
}

function receiveReturn(id, body = {}, { actor = "system" } = {}) {
  const returnCase = store.getCaseById(id);
  if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

  let updated = transitionCase(returnCase, RETURN_STATES.RECEIVED);
  if (body.returnTrackingNumber) {
    updated.returnTrackingNumber = body.returnTrackingNumber;
  }
  updated.lastAction = "RETURN_RECEIVED";
  updated = withReconciliation(updated);
  store.saveCase(updated);
  recordReturnAudit({ action: AUDIT_ACTIONS.RETURN_RECEIVED, returnCaseId: id, actor });
  return updated;
}

function inspectReturn(id, body = {}, { actor = "system" } = {}) {
  const returnCase = store.getCaseById(id);
  if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

  const inspection = normalizeInspection(body);
  let updated = {
    ...returnCase,
    inspection,
    status: RETURN_STATES.INSPECTED,
    lastAction: "RETURN_INSPECTED",
  };
  updated = withReconciliation(updated);
  store.saveCase(updated);
  recordReturnAudit({
    action: AUDIT_ACTIONS.RETURN_INSPECTED,
    returnCaseId: id,
    actor,
    metadata: { resellable: inspection.resellable, condition: inspection.condition },
  });
  return updated;
}

function calculateRefundForCase(id) {
  const returnCase = store.getCaseById(id);
  if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

  const inspectionCheck = validateInspectionRequired(returnCase);
  if (!inspectionCheck.ok) {
    throw createReturnRecoveryError(
      ERROR_CODES.INSPECTION_REQUIRED,
      "Inspection required before refund calculation"
    );
  }

  const customerRefund = calculateCustomerRefund(returnCase);
  let updated = {
    ...returnCase,
    customerRefund,
    customerRefundAmount: customerRefund.totalRefundAmount,
    status: RETURN_STATES.REFUND_PENDING,
    lastAction: "CUSTOMER_REFUND_CALCULATED",
  };
  updated = withReconciliation(updated);
  store.saveCase(updated);
  recordReturnAudit({
    action: AUDIT_ACTIONS.CUSTOMER_REFUND_CALCULATED,
    returnCaseId: id,
    metadata: customerRefund,
  });
  return { returnCase: updated, customerRefund };
}

function requestCustomerRefund(id, { idempotencyKey, actor = "system" } = {}) {
  return withIdempotency(`refund_request:${id}`, idempotencyKey, () => {
    const returnCase = store.getCaseById(id);
    if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

    const gate = assertRefundExecutionAllowed();
    const customerRefund =
      returnCase.customerRefund || calculateCustomerRefund(returnCase);

    if (gate.blocked) {
      recordReturnAudit({
        action: AUDIT_ACTIONS.CUSTOMER_REFUND_BLOCKED,
        returnCaseId: id,
        actor,
        result: "blocked",
        metadata: { code: gate.code },
      });
      return {
        status: gate.code,
        blocked: true,
        diagnosticOnly: true,
        refundInstruction: {
          returnCaseId: id,
          amount: customerRefund.totalRefundAmount,
          currency: customerRefund.currency,
          execution: "BLOCKED",
          reason: gate.message,
        },
        customerRefund,
      };
    }

    const refundInstruction = {
      returnCaseId: id,
      amount: customerRefund.totalRefundAmount,
      currency: customerRefund.currency,
      execution: "READY",
      paymentLayer: "existing_payment_gate",
    };

    let updated = {
      ...returnCase,
      customerRefund,
      customerRefundAmount: customerRefund.totalRefundAmount,
      refundInstruction,
      status: RETURN_STATES.REFUNDED,
      lastAction: "CUSTOMER_REFUND_REQUESTED",
    };
    updated = withReconciliation(updated);
    store.saveCase(updated);
    recordReturnAudit({
      action: AUDIT_ACTIONS.CUSTOMER_REFUND_REQUESTED,
      returnCaseId: id,
      actor,
      metadata: { amount: customerRefund.totalRefundAmount },
    });
    return { returnCase: updated, refundInstruction, blocked: false };
  });
}

function createSupplierRecoveryClaim(id, { idempotencyKey, actor = "system", dryRun = true } = {}) {
  return withIdempotency(`supplier_claim:${id}`, idempotencyKey, () => {
    const returnCase = store.getCaseById(id);
    if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

    if (returnCase.decisionStatus === "REVIEW_REQUIRED") {
      throw createReturnRecoveryError(
        ERROR_CODES.LIABILITY_REVIEW_REQUIRED,
        "Liability review required before supplier claim"
      );
    }

    const recovery = calculateSupplierRecovery(returnCase);
    const gate = assertSupplierLiveAllowed({ dryRun });

    const claim = {
      supplierId: returnCase.supplierId,
      supplierOrderId: returnCase.supplierOrderId,
      productId: returnCase.productId,
      reason: returnCase.reason,
      liability: recovery.liability,
      requestedRefund: recovery.supplierRefundAmount,
      requestedCredit: recovery.supplierCreditAmount,
      shippingRecovery: recovery.shippingRecoveryAmount,
      evidenceReferences: (returnCase.evidence || []).map((e) => e.id || e.reference).filter(Boolean),
      status: gate.blocked ? "SUPPLIER_LIVE_DISABLED" : "REQUESTED",
      diagnosticOnly: gate.blocked,
    };

    const events = [...(returnCase.supplierRecoveryEvents || [])];
    const claimKey = `SUPPLIER_CLAIM:${id}`;
    if (!events.some((e) => e.idempotencyKey === claimKey)) {
      if (recovery.supplierRefundRequested && recovery.supplierRefundAmount > 0) {
        events.push({
          id: `sre_${Date.now()}_refund`,
          type: SUPPLIER_RECOVERY_EVENT_TYPES.REFUND,
          requestedAmount: recovery.supplierRefundAmount,
          confirmedAmount: 0,
          currency: returnCase.currency || "EUR",
          reference: null,
          status: gate.blocked ? "PENDING" : "REQUESTED",
          idempotencyKey: claimKey,
        });
      }
      if (recovery.supplierCreditRequested && recovery.supplierCreditAmount > 0) {
        events.push({
          id: `sre_${Date.now()}_credit`,
          type: SUPPLIER_RECOVERY_EVENT_TYPES.CREDIT_NOTE,
          requestedAmount: recovery.supplierCreditAmount,
          confirmedAmount: 0,
          currency: returnCase.currency || "EUR",
          reference: null,
          status: gate.blocked ? "PENDING" : "REQUESTED",
          idempotencyKey: `${claimKey}:credit`,
        });
      }
    }

    let updated = {
      ...returnCase,
      supplierRecovery: recovery,
      supplierRecoveryEvents: events,
      supplierRecoveryExpected: recovery.totalExpectedRecovery,
      supplierRecoveryStatus: SUPPLIER_RECOVERY_STATUS.PENDING,
      supplierClaim: claim,
      status: RETURN_STATES.SUPPLIER_RECOVERY_PENDING,
      lastAction: gate.blocked ? "SUPPLIER_CLAIM_CREATED" : "SUPPLIER_CLAIM_REQUESTED",
    };
    updated = withReconciliation(updated);
    store.saveCase(updated);

    recordReturnAudit({
      action: gate.blocked ? AUDIT_ACTIONS.SUPPLIER_CLAIM_CREATED : AUDIT_ACTIONS.SUPPLIER_CLAIM_REQUESTED,
      returnCaseId: id,
      actor,
      metadata: { diagnosticOnly: gate.blocked, claim },
    });

    if (gate.blocked) {
      return { status: "SUPPLIER_LIVE_DISABLED", diagnosticOnly: true, claim, returnCase: updated };
    }
    return { claim, returnCase: updated, diagnosticOnly: false };
  });
}

function confirmSupplierRecovery(id, body = {}, { idempotencyKey, actor = "system" } = {}) {
  return withIdempotency(`supplier_confirm:${id}:${body.reference || "default"}`, idempotencyKey, () => {
    const returnCase = store.getCaseById(id);
    if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

    const events = [...(returnCase.supplierRecoveryEvents || [])];
    const type = String(body.type || SUPPLIER_RECOVERY_EVENT_TYPES.REFUND).toUpperCase();
    const confirmedAmount = Number(body.confirmedAmount || body.amount || 0);
    const reference = body.reference || body.creditNoteNumber || null;

    if (type === SUPPLIER_RECOVERY_EVENT_TYPES.CREDIT_NOTE && reference) {
      const creditKey = `SUPPLIER_CREDIT:${id}:${reference}`;
      const creditNotes = [...(returnCase.creditNotes || [])];
      if (creditNotes.some((c) => c.creditNoteNumber === reference)) {
        throw createReturnRecoveryError(
          ERROR_CODES.CREDIT_NOTE_DUPLICATE,
          "Duplicate credit note",
          { reference }
        );
      }
      creditNotes.push({
        creditNoteRequested: true,
        creditNoteNumber: reference,
        creditNoteAmount: confirmedAmount,
        creditNoteCurrency: returnCase.currency || "EUR",
        creditNoteDate: body.creditNoteDate || new Date().toISOString(),
        creditNoteStatus: body.verified ? CREDIT_NOTE_STATUS.VERIFIED : CREDIT_NOTE_STATUS.RECEIVED,
        verified: Boolean(body.verified),
      });

      if (!body.verified) {
        recordReturnAudit({
          action: AUDIT_ACTIONS.SUPPLIER_CREDIT_RECEIVED,
          returnCaseId: id,
          actor,
          metadata: { reference, verified: false },
        });
      }

      const eventIdx = events.findIndex(
        (e) => e.type === SUPPLIER_RECOVERY_EVENT_TYPES.CREDIT_NOTE && e.reference === reference
      );
      const event = {
        id: eventIdx >= 0 ? events[eventIdx].id : `sre_${Date.now()}_cn`,
        type: SUPPLIER_RECOVERY_EVENT_TYPES.CREDIT_NOTE,
        requestedAmount: confirmedAmount,
        confirmedAmount: body.verified ? confirmedAmount : 0,
        currency: returnCase.currency || "EUR",
        reference,
        status: body.verified ? "CONFIRMED" : "RECEIVED",
        idempotencyKey: creditKey,
      };
      if (eventIdx >= 0) events[eventIdx] = event;
      else events.push(event);

      if (!body.verified) {
        let pending = {
          ...returnCase,
          creditNotes,
          supplierRecoveryEvents: events,
          lastAction: "SUPPLIER_CREDIT_RECEIVED",
        };
        pending = withReconciliation(pending);
        store.saveCase(pending);
        throw createReturnRecoveryError(
          ERROR_CODES.CREDIT_NOTE_UNVERIFIED,
          "Credit note received but not verified — cannot book recovery",
          { returnCase: pending }
        );
      }

      recordReturnAudit({
        action: AUDIT_ACTIONS.SUPPLIER_CREDIT_VERIFIED,
        returnCaseId: id,
        actor,
        metadata: { reference, amount: confirmedAmount },
      });

      let updated = {
        ...returnCase,
        creditNotes,
        supplierRecoveryEvents: events,
        status: RETURN_STATES.SUPPLIER_CREDIT_CONFIRMED,
        lastAction: "SUPPLIER_CREDIT_VERIFIED",
      };
      updated = withReconciliation(updated);
      store.saveCase(updated);
      return { returnCase: updated, confirmedAmount, type };
    }

    const pendingEvent = events.find(
      (e) =>
        e.type === type &&
        (!reference || e.reference === reference) &&
        Number(e.confirmedAmount || 0) === 0
    );
    if (pendingEvent) {
      pendingEvent.confirmedAmount = confirmedAmount;
      pendingEvent.status = "CONFIRMED";
      pendingEvent.reference = reference;
    } else {
      events.push({
        id: `sre_${Date.now()}`,
        type,
        requestedAmount: confirmedAmount,
        confirmedAmount,
        currency: returnCase.currency || "EUR",
        reference,
        status: "CONFIRMED",
      });
    }

    recordReturnAudit({
      action: AUDIT_ACTIONS.SUPPLIER_REFUND_CONFIRMED,
      returnCaseId: id,
      actor,
      metadata: { type, confirmedAmount, reference },
    });

    let updated = {
      ...returnCase,
      supplierRecoveryEvents: events,
      status:
        type === SUPPLIER_RECOVERY_EVENT_TYPES.CREDIT_NOTE
          ? RETURN_STATES.SUPPLIER_CREDIT_CONFIRMED
          : RETURN_STATES.SUPPLIER_REFUND_CONFIRMED,
      lastAction: "SUPPLIER_REFUND_CONFIRMED",
    };
    updated = withReconciliation(updated);
    store.saveCase(updated);
    return { returnCase: updated, confirmedAmount, type };
  });
}

function reconcileReturnCase(id, { actor = "system" } = {}) {
  const returnCase = store.getCaseById(id);
  if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

  const reconciliation = reconcileReturn(returnCase);
  let updated = {
    ...returnCase,
    reconciliation,
    supplierRecoveryConfirmed: reconciliation.supplierRecoveryConfirmed,
    supplierRecoveryExpected:
      returnCase.supplierRecoveryExpected ?? reconciliation.supplierRecoveryExpected,
    unrecoveredAmount: reconciliation.unrecoveredAmount,
    buzzardNetImpact: reconciliation.buzzardNetImpact,
    lastAction: "RECOVERY_RECONCILED",
  };
  store.saveCase(updated);
  recordReturnAudit({
    action: AUDIT_ACTIONS.RECOVERY_RECONCILED,
    returnCaseId: id,
    actor,
    metadata: reconciliation,
  });
  return { returnCase: updated, reconciliation };
}

function closeReturnCase(id, { actor = "system" } = {}) {
  const returnCase = store.getCaseById(id);
  if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");

  let updated = transitionCase(returnCase, RETURN_STATES.CLOSED);
  updated.lastAction = "RETURN_CLOSED";
  updated = withReconciliation(updated);
  store.saveCase(updated);
  recordReturnAudit({ action: AUDIT_ACTIONS.RETURN_CLOSED, returnCaseId: id, actor });
  return updated;
}

function getReturnCase(id) {
  const returnCase = store.getCaseById(id);
  if (!returnCase) throw createReturnRecoveryError(ERROR_CODES.RETURN_NOT_FOUND, "Return not found");
  return returnCase;
}

function listReturnCases(filter = {}) {
  return store.listCases(filter);
}

function getDashboardWarnings(returnCase) {
  const warnings = [];
  const expected = returnCase.supplierRecoveryExpected || 0;
  const confirmed = returnCase.supplierRecoveryConfirmed || 0;
  const customerRefund = returnCase.customerRefundAmount || 0;

  if (expected > confirmed) warnings.push("SUPPLIER RECOVERY PENDING");
  if (customerRefund > confirmed) warnings.push("BUZZARD EXPOSURE");
  if (returnCase.supplierLiability === "UNKNOWN") warnings.push("REVIEW REQUIRED");
  const unverifiedCredit = (returnCase.creditNotes || []).find(
    (c) => c.creditNoteStatus === CREDIT_NOTE_STATUS.RECEIVED && !c.verified
  );
  if (unverifiedCredit) warnings.push("CREDIT NOTE VERIFICATION REQUIRED");
  return warnings;
}

function enrichForDashboard(returnCase) {
  return {
    ...returnCase,
    warnings: getDashboardWarnings(returnCase),
    customerRefund: returnCase.customerRefundAmount || 0,
    supplierRecoveryExpected: returnCase.supplierRecoveryExpected || 0,
    supplierRecoveryConfirmed: returnCase.supplierRecoveryConfirmed || 0,
  };
}

module.exports = {
  createReturnCase,
  approveReturn,
  receiveReturn,
  inspectReturn,
  calculateRefundForCase,
  requestCustomerRefund,
  createSupplierRecoveryClaim,
  confirmSupplierRecovery,
  reconcileReturnCase,
  closeReturnCase,
  getReturnCase,
  listReturnCases,
  enrichForDashboard,
  getDashboardWarnings,
  calculateCustomerRefund,
  calculateSupplierRecovery,
  reconcileReturn,
  __resetForTests: () => {
    store.__resetStoreForTests();
    require("./audit").__resetAuditForTests();
  },
};
