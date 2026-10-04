"use strict";

const { createGoLiveGate } = require("./goLiveGate");
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sot/sourceOfTruthRegistry");
const { createCanonicalOrderFacade } = require("./canonicalOrderFacade");
const { assertLockedSafety } = require("./finalRegressionManifest");

const CLOSURE_CHECKS = Object.freeze([
  "order_sot",
  "product_sot",
  "persistence",
  "idempotency",
  "auth_rbac",
  "approval",
  "runtime",
  "regression",
  "build",
  "typecheck",
  "lint",
  "production_config",
  "safety_flags",
]);

function passFail(ok, reason) {
  return { status: ok ? "PASS" : "FAIL", reason };
}

function createProductionGoLiveClosure(options = {}) {
  const env = options.env || process.env;
  const quality = options.quality || {};
  const gate = options.gate || createGoLiveGate({ env, productionSafetyLock: true, ...options.gateOptions });
  const sot = options.sotRegistry || createSourceOfTruthRegistry({ env });
  const facade = options.orderFacade || createCanonicalOrderFacade({ env });

  function evaluateChecks() {
    const goLive = gate.evaluateGoLive({ approvalId: options.approvalId });
    const byId = Object.fromEntries((goLive.checks || []).map((row) => [row.id, row]));
    const owners = {
      order: sot.getWriteOwner(ENTITIES.ORDER),
      product: sot.getWriteOwner(ENTITIES.PRODUCT),
    };
    let safetyOk = false;
    try {
      assertLockedSafety(env);
      safetyOk = env.BUZZARD_SALES_ENABLED !== "1";
    } catch {
      safetyOk = false;
    }

    const persistenceRow = byId.productionDb;
    const persistencePass = persistenceRow?.status === "PASS";
    const approvalPass = goLive.evidence?.approval?.status === "APPROVED";

    return {
      order_sot: passFail(owners.order === ACTORS.ORDER_ENGINE && facade.usesLegacyJson() === false, owners.order),
      product_sot: passFail(owners.product === ACTORS.PRODUCT_ENGINE, owners.product),
      persistence: passFail(persistencePass, persistenceRow?.reason || "NOT_PROVEN"),
      idempotency: passFail(byId.idempotency?.status === "PASS", byId.idempotency?.reason || "missing"),
      auth_rbac: passFail(byId.security?.status === "PASS", byId.security?.reason || "SECURITY_GATE_NOT_PROVEN"),
      approval: passFail(approvalPass, "GO_LIVE_PRODUCTION approval required"),
      runtime: passFail(env.PUSAT_RUNTIME_HEALTHY === "1" && env.PUSAT_RUNTIME_ENABLED === "1", "PUSAT_RUNTIME_NOT_PROVEN"),
      regression: passFail(quality.regression === "PASS", quality.regression || "NOT_RUN"),
      build: passFail(quality.build === "PASS", quality.build || "NOT_RUN"),
      typecheck: passFail(quality.typecheck === "PASS", quality.typecheck || "NOT_RUN"),
      lint: passFail(quality.lint === "PASS", quality.lint || "NOT_RUN"),
      production_config: passFail(byId.deployment?.status === "PASS", byId.deployment?.reason || "RENDER_NOT_VERIFIED"),
      safety_flags: passFail(safetyOk && env.BUZZARD_SALES_ENABLED !== "1", "SALES_MUST_STAY_OFF_UNTIL_ELIGIBLE"),
    };
  }

  function evaluate() {
    const raw = evaluateChecks();
    const checks = {};
    const failedChecks = [];
    for (const id of CLOSURE_CHECKS) {
      checks[id] = raw[id].status;
      if (raw[id].status !== "PASS") failedChecks.push(id);
    }
    const eligible = failedChecks.length === 0;
    return {
      eligible,
      salesEnabled: false,
      checks,
      failedChecks,
      reasons: raw,
      generatedAt: new Date().toISOString(),
    };
  }

  return Object.freeze({ evaluate, CLOSURE_CHECKS });
}

module.exports = { createProductionGoLiveClosure, CLOSURE_CHECKS };
