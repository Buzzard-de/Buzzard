"use strict";

const { createGoLiveGate, STATES } = require("./goLiveGate");
const { createSotAudit } = require("./sot/sotAudit");

function createGoLiveActivation(options = {}) {
  const env = options.env || process.env;
  const store = options.store || { state: STATES.LOCKED, salesEnabled: false, lastApprovalId: null, activations: 0 };
  let lock = false;
  const emit = options.logAudit || ((row) => {
    const audit = createSotAudit({ logAudit: () => {} });
    audit.record({ result: "accepted", entity: "GO_LIVE", operation: row.action, correlationId: row.metadata?.correlationId });
  });
  const mutateEnv = options.mutateEnv === true;

  function gate(extra) {
    return createGoLiveGate({
      ...options,
      env,
      activationState: store.state,
      approval: extra?.approval || options.approval,
    });
  }

  function getState() {
    return {
      state: store.state,
      salesEnabled: false,
      activations: store.activations,
      lastApprovalId: store.lastApprovalId,
    };
  }

  function activateProduction({ approvalId, correlationId } = {}) {
    if (lock) {
      return { ok: false, code: "IN_PROGRESS", state: store.state, salesEnabled: false, correlationId };
    }
    lock = true;
    try {
      const approval = typeof options.getApproval === "function" ? options.getApproval(approvalId) : options.approval;
      const evaluator = gate({ approval });
      const report = evaluator.evaluateGoLive({ approvalId });
      emit({
        action: "GO_LIVE_ACTIVATION_EVALUATED",
        entityType: "GO_LIVE",
        entityId: approvalId || "none",
        metadata: { correlationId, status: report.status, decision: report.decision },
      });

      if (options.bypass === true || options.force === true) {
        return { ok: false, code: "BYPASS_FORBIDDEN", state: store.state, salesEnabled: false, correlationId };
      }
      if (report.status !== "PASS" || report.decision !== "GO") {
        store.state = report.lifecycle === STATES.APPROVED ? STATES.APPROVED : report.lifecycle;
        return {
          ok: false,
          code: "ACTIVATION_BLOCKED",
          state: store.state,
          salesEnabled: false,
          report,
          correlationId,
        };
      }

      if (store.state === STATES.ACTIVE) {
        store.activations += 1;
        emit({
          action: "GO_LIVE_ACTIVATION_REPLAY",
          entityType: "GO_LIVE",
          entityId: approvalId,
          metadata: { correlationId },
        });
        return { ok: true, replayed: true, state: STATES.ACTIVE, salesEnabled: false, correlationId };
      }

      store.state = STATES.ACTIVE;
      store.salesEnabled = false;
      store.lastApprovalId = approvalId;
      store.activations += 1;
      if (mutateEnv) {
        env.BUZZARD_SALES_ENABLED = "1";
      }
      emit({
        action: "GO_LIVE_ACTIVATION_COMPLETED",
        entityType: "GO_LIVE",
        entityId: approvalId,
        metadata: { correlationId, mutateEnv: false, salesEnvUnchanged: env.BUZZARD_SALES_ENABLED !== "1" },
      });
      return { ok: true, replayed: false, state: STATES.ACTIVE, salesEnabled: false, correlationId };
    } finally {
      lock = false;
    }
  }

  async function activateConcurrent(requests) {
    const started = requests.map((req) => activateProduction(req));
    const results = await Promise.all(started);
    const success = results.filter((row) => row.ok && !row.replayed);
    return { results, uniqueTransitions: success.length <= 1 };
  }

  function deactivateProduction({ reason, actor, correlationId } = {}) {
    store.state = STATES.SUSPENDED;
    store.salesEnabled = false;
    if (mutateEnv) {
      env.BUZZARD_SALES_ENABLED = "0";
      env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "0";
      env.BUZZARD_PAYMENT_LIVE = "0";
    }
    emit({
      action: "GO_LIVE_DEACTIVATED",
      entityType: "GO_LIVE",
      entityId: store.lastApprovalId || "none",
      actor: actor || "admin",
      metadata: { reason: reason || "manual", correlationId, ordersPreserved: true },
    });
    return {
      ok: true,
      state: STATES.SUSPENDED,
      salesEnabled: false,
      supplierOrders: false,
      payments: false,
      marketplaceWrites: false,
      ordersPreserved: true,
      destructiveRollback: false,
      correlationId,
    };
  }

  return Object.freeze({
    getState,
    activateProduction,
    activateConcurrent,
    deactivateProduction,
    STATES,
  });
}

module.exports = { createGoLiveActivation };
