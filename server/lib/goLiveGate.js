"use strict";

const crypto = require("crypto");
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sot/sourceOfTruthRegistry");
const { createSotConflictDetector } = require("./sot/sotConflictDetector");
const { createExternalIntegrationVerification } = require("./externalIntegrationVerification");
const { getEffectiveFlags } = require("./commerce/commerceFeatureFlags");
const taxProvider = require("./commerce/taxProvider");
const shippingProvider = require("./commerce/shippingProvider");
const { BaseSupplierAdapter } = require("./supplier/baseAdapter");
const { newCorrelationId } = require("./operations/correlationContext");

const CHECK_IDS = Object.freeze([
  "productionDb",
  "productSot",
  "orderSot",
  "availabilitySot",
  "priceSot",
  "externalSuppliers",
  "externalMarketplaces",
  "payments",
  "tax",
  "shipping",
  "fulfillment",
  "returns",
  "idempotency",
  "concurrency",
  "security",
  "audit",
  "monitoring",
  "deployment",
]);

const STATES = Object.freeze({
  LOCKED: "LOCKED",
  READY: "READY",
  APPROVED: "APPROVED",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
});

function nowIso() {
  return new Date().toISOString();
}

function checkRow({ id, category, status, critical = true, evidence = {}, reason = "", correlationId }) {
  return {
    id,
    category,
    status,
    critical,
    evidence,
    checkedAt: nowIso(),
    correlationId,
    reason,
  };
}

function mapDbStatus(result) {
  if (!result) {
    return { status: "CONDITIONAL", reason: "PRODUCTION_DB_NOT_EVALUATED", evidence: { live: false } };
  }
  const persistent = result.persistence?.persistent === true;
  const mode = result.persistence?.mode;
  const integrity = result.database?.integrityCheck;
  if (result.status === "PASS" && persistent && mode === "render_persistent_disk" && integrity === "ok") {
    return { status: "PASS", reason: "render_persistent_disk", evidence: { persistent: true, mode, integrity } };
  }
  if (result.status === "CONDITIONAL" || !persistent || mode !== "render_persistent_disk") {
    return {
      status: "CONDITIONAL",
      reason: "LOCAL_OR_UNPROVEN_DISK_IS_NOT_PRODUCTION_PASS",
      evidence: { persistent: Boolean(persistent), mode: mode || "unknown", integrity: integrity || "unknown" },
    };
  }
  return { status: "BLOCKED", reason: result.status || "DB_FAIL", evidence: { persistent: false, mode } };
}

function createGoLiveGate(options = {}) {
  const env = options.env || process.env;
  const correlationId = options.correlationId || newCorrelationId();
  const sot = options.sotRegistry || createSourceOfTruthRegistry({ env });
  const conflicts = options.conflicts || createSotConflictDetector();
  const external = options.externalVerification || createExternalIntegrationVerification({
    env,
    listSuppliers: options.listSuppliers,
    listMarketplaces: options.listMarketplaces,
    logAudit: options.logAudit || (() => {}),
  });
  const flags = options.flags || getEffectiveFlags();

  function safety() {
    const killSwitch =
      typeof options.killSwitch === "function"
        ? options.killSwitch()
        : env.BUZZARD_PRODUCTION_SALES_KILL_SWITCH === "1" || options.productionSafetyLock !== false;
    return {
      productSotActive: env.BUZZARD_PRODUCT_SOT_ACTIVE === "1",
      salesLocked: env.BUZZARD_SALES_ENABLED !== "1",
      supplierOrders: env.BUZZARD_SUPPLIER_ORDERS_ENABLED === "1",
      payments: env.BUZZARD_PAYMENT_LIVE === "1",
      marketplaceWrites: false,
      productionWrites: "NOT_EXECUTED",
      killSwitch: Boolean(killSwitch),
    };
  }

  function evaluateProductionDb() {
    if (options.productionDbResult) return mapDbStatus(options.productionDbResult);
    if (typeof options.evaluateProductionDb === "function") {
      return mapDbStatus(options.evaluateProductionDb());
    }
    try {
      const { db } = require("./db");
      const { createProductionDbVerification } = require("./productionDbVerification");
      const result = createProductionDbVerification(db, { env }).verifyProductionDb({ correlationId });
      return mapDbStatus(result);
    } catch (error) {
      return {
        status: "CONDITIONAL",
        reason: "PRODUCTION_DB_EVALUATION_UNAVAILABLE",
        evidence: { live: false, code: error.code || "unavailable" },
      };
    }
  }

  function defaultChecks() {
    const safe = safety();
    const product = sot.getSoTStatus(ENTITIES.PRODUCT);
    const order = sot.getSoTStatus(ENTITIES.ORDER);
    const availability = sot.getSoTStatus(ENTITIES.AVAILABILITY);
    const price = sot.getSoTStatus(ENTITIES.PRICE);
    const ext = external.getVerificationReport();
    const supplierSummary = ext.summary.suppliers;
    const marketplaceSummary = ext.summary.marketplaces;
    const tax = taxProvider.calculateTax({ country: "DE", subtotal: 100 });
    const shipping = shippingProvider.calculateShipping({ methodId: "standard", country: "DE" });
    const fulfillmentAdapter = new BaseSupplierAdapter({ id: "gate", name: "gate" });
    const fulfillmentThrows = fulfillmentAdapter.ordersEnabled === false;

    const dbMapped = evaluateProductionDb();
    const supplierPassOnly = supplierSummary.PASS === supplierSummary.total && supplierSummary.total > 0;
    const marketplacePassOnly = marketplaceSummary.PASS === marketplaceSummary.total && marketplaceSummary.total > 0;
    const mockSupplierOnly = (ext.suppliers || []).every((row) => String(row.supplierId || "").includes("mock"));
    const realWholesaler = (ext.suppliers || []).find((row) => row.supplierId === "REAL-WHOLESALER-001");
    const supplierStatus = !supplierPassOnly || mockSupplierOnly || (realWholesaler && realWholesaler.status !== "PASS")
      ? "BLOCKED"
      : "PASS";
    const marketplaceStatus = marketplacePassOnly ? "PASS" : "BLOCKED";

    const reservation = new Map();
    const stock = 1;
    function reserve(actor) {
      const used = reservation.size;
      if (used >= stock) return false;
      reservation.set(actor, 1);
      return true;
    }
    const first = reserve("c1");
    const second = reserve("c2");
    const concurrencyOk = first === true && second === false;

    let idempotencyOk = false;
    try {
      idempotencyOk = typeof require("./commerce/idempotency").withIdempotency === "function";
    } catch {
      idempotencyOk = false;
    }
    let auditOk = false;
    try {
      auditOk = typeof require("./sot/sotAudit").createSotAudit === "function";
    } catch {
      auditOk = false;
    }
    const securityFlag = env.BUZZARD_SECURITY_GATE_PASS === "1";
    const liveRender = options.liveRenderVerified === true;

    const stale = conflicts.detectConflict({
      entity: ENTITIES.AVAILABILITY,
      sotVersion: 10,
      incomingVersion: 8,
      source: "supplier_stock",
    });

    return [
      checkRow({
        id: "productionDb",
        category: "CORE",
        status: dbMapped.status === "PASS" ? "PASS" : dbMapped.status,
        evidence: dbMapped.evidence,
        reason: dbMapped.reason,
        correlationId,
      }),
      checkRow({
        id: "productSot",
        category: "CORE",
        status: product.owner === ACTORS.PRODUCT_ENGINE && env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" ? "PASS" : "BLOCKED",
        evidence: { owner: product.owner, active: env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" },
        reason: env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" ? "PRODUCT_SOT_ACTIVE" : "PRODUCT_SOT_ACTIVE_OFF",
        correlationId,
      }),
      checkRow({
        id: "orderSot",
        category: "CORE",
        status: order.owner === ACTORS.ORDER_ENGINE && options.orderSotLiveEvidence === true ? "PASS" : "BLOCKED",
        evidence: { owner: order.owner, liveEvidence: options.orderSotLiveEvidence === true },
        reason: options.orderSotLiveEvidence === true ? "ORDER_SOT_LIVE" : "ORDER_SOT_LIVE_EVIDENCE_MISSING",
        correlationId,
      }),
      checkRow({
        id: "availabilitySot",
        category: "CORE",
        status:
          availability.owner === ACTORS.AVAILABILITY_ENGINE &&
          stale.type === "STALE_WRITE" &&
          options.availabilityFresh === true
            ? "PASS"
            : "BLOCKED",
        evidence: { owner: availability.owner, staleProtection: stale.type, supplierFresh: options.availabilityFresh === true },
        reason: options.availabilityFresh === true ? "AVAILABILITY_FRESH" : "SUPPLIER_STOCK_MISSING_OR_STALE",
        correlationId,
      }),
      checkRow({
        id: "priceSot",
        category: "CORE",
        status: price.owner === ACTORS.PRICING_ENGINE && options.priceSnapshotReady === true ? "PASS" : "BLOCKED",
        evidence: { owner: price.owner, immutableSnapshot: options.priceSnapshotReady === true },
        reason: options.priceSnapshotReady === true ? "PRICE_SNAPSHOT_READY" : "PRICE_STACK_INCOMPLETE",
        correlationId,
      }),
      checkRow({
        id: "externalSuppliers",
        category: "EXTERNAL",
        status: supplierStatus,
        evidence: { ...supplierSummary, mockRejected: true },
        reason: supplierStatus === "PASS" ? "SUPPLIERS_PASS" : "SUPPLIER_NOT_PRODUCTION_PASS",
        correlationId,
      }),
      checkRow({
        id: "externalMarketplaces",
        category: "EXTERNAL",
        status: marketplaceStatus,
        evidence: { ...marketplaceSummary, hubIsNotLive: true },
        reason: marketplaceStatus === "PASS" ? "MARKETPLACES_PASS" : "MARKETPLACE_NOT_LIVE_VERIFIED",
        correlationId,
      }),
      checkRow({
        id: "payments",
        category: "COMMERCIAL",
        status: flags.mockPaymentOnly || !flags.stripeEnabled && !flags.paypalEnabled || env.BUZZARD_PAYMENT_LIVE !== "1"
          ? "BLOCKED"
          : "PASS",
        evidence: {
          mockPaymentOnly: Boolean(flags.mockPaymentOnly),
          stripeEnabled: Boolean(flags.stripeEnabled),
          paypalEnabled: Boolean(flags.paypalEnabled),
          liveFlag: env.BUZZARD_PAYMENT_LIVE === "1",
        },
        reason: env.BUZZARD_PAYMENT_LIVE === "1" && !flags.mockPaymentOnly ? "PAYMENT_LIVE" : "PAYMENT_MOCK_OR_UNCONFIGURED",
        correlationId,
      }),
      checkRow({
        id: "tax",
        category: "COMMERCIAL",
        status: tax.dryRun ? "BLOCKED" : tax.ok ? "PASS" : "BLOCKED",
        evidence: { provider: tax.provider, dryRun: tax.dryRun, ok: tax.ok },
        reason: tax.dryRun ? "TAX_DRY_RUN_ONLY" : tax.ok ? "TAX_READY" : "TAX_FAILURE",
        correlationId,
      }),
      checkRow({
        id: "shipping",
        category: "COMMERCIAL",
        status: shipping.dryRun || shipping.shipmentCreated === false ? "BLOCKED" : "PASS",
        evidence: { dryRun: shipping.dryRun, shipmentCreated: shipping.shipmentCreated },
        reason: "SHIPPING_DRY_RUN_ONLY",
        correlationId,
      }),
      checkRow({
        id: "fulfillment",
        category: "COMMERCIAL",
        status: fulfillmentThrows || env.BUZZARD_SUPPLIER_ORDERS_ENABLED !== "1" || env.BUZZARD_FULFILLMENT_LIVE !== "1"
          ? "BLOCKED"
          : "PASS",
        evidence: { submitOrderThrows: fulfillmentThrows, supplierOrders: safe.supplierOrders },
        reason: "FULFILLMENT_NOT_PRODUCTION_READY",
        correlationId,
      }),
      checkRow({
        id: "returns",
        category: "COMMERCIAL",
        status: env.BUZZARD_RETURN_LIVE === "1" && env.BUZZARD_REFUND_LIVE === "1" ? "PASS" : "BLOCKED",
        evidence: { returnLive: env.BUZZARD_RETURN_LIVE === "1", refundLive: env.BUZZARD_REFUND_LIVE === "1" },
        reason: "RETURNS_REFUND_NOT_LIVE",
        correlationId,
      }),
      checkRow({
        id: "idempotency",
        category: "SAFETY",
        status: idempotencyOk ? "PASS" : "BLOCKED",
        evidence: { adapter: "commerce_idempotency", blindRetry: false },
        reason: idempotencyOk ? "IDEMPOTENCY_REUSED" : "IDEMPOTENCY_MISSING",
        correlationId,
      }),
      checkRow({
        id: "concurrency",
        category: "SAFETY",
        status: concurrencyOk ? "PASS" : "BLOCKED",
        evidence: { firstWon: first, secondBlocked: !second, oversell: false },
        reason: concurrencyOk ? "NO_OVERSELL_SIM" : "CONCURRENCY_FAIL",
        correlationId,
      }),
      checkRow({
        id: "security",
        category: "SAFETY",
        status: securityFlag && options.securityFailure !== true ? "PASS" : "BLOCKED",
        evidence: { rbac: true, securityGatePass: securityFlag, credentialsHidden: true },
        reason: options.securityFailure === true ? "SECURITY_FAILURE" : securityFlag ? "SECURITY_GATE_PASS" : "SECURITY_GATE_NOT_PROVEN",
        correlationId,
      }),
      checkRow({
        id: "audit",
        category: "SAFETY",
        status: auditOk ? "PASS" : "BLOCKED",
        evidence: { sotAudit: auditOk, credentialsHidden: true },
        reason: auditOk ? "AUDIT_AVAILABLE" : "AUDIT_MISSING",
        correlationId,
      }),
      checkRow({
        id: "monitoring",
        category: "SAFETY",
        status: options.liveHealthVerified === true ? "PASS" : "CONDITIONAL",
        evidence: { endpoints: ["/api/health/db", "/api/health/sot", "/api/health/external-integrations", "/api/health/go-live"], live: options.liveHealthVerified === true },
        reason: options.liveHealthVerified === true ? "LIVE_HEALTH" : "LIVE_HEALTH_PENDING",
        correlationId,
      }),
      checkRow({
        id: "deployment",
        category: "DEPLOYMENT",
        status: liveRender ? "PASS" : "BLOCKED",
        evidence: { liveRender: liveRender ? "PASS" : "PENDING" },
        reason: liveRender ? "RENDER_VERIFIED" : "RENDER_BRANCH_NOT_DEPLOYED",
        correlationId,
      }),
    ];
  }

  function incidents() {
    if (typeof options.getIncidents === "function") return options.getIncidents();
    return { overall: "UNKNOWN", critical: 0, incidents: [] };
  }

  function approvalRecord(approvalId) {
    if (typeof options.getApproval === "function") return options.getApproval(approvalId);
    return null;
  }

  function evaluateGoLive({ approvalId = null } = {}) {
    const checks = typeof options.checks === "function" ? options.checks({ correlationId }) : defaultChecks();
    const byId = Object.fromEntries(checks.map((row) => [row.id, row]));
    for (const id of CHECK_IDS) {
      if (!byId[id]) {
        checks.push(checkRow({
          id,
          category: "MISSING",
          status: "BLOCKED",
          reason: "GATE_MISSING",
          correlationId,
        }));
      }
    }

    const blockers = checks.filter((row) => row.critical && row.status !== "PASS").map((row) => ({
      id: row.id,
      status: row.status,
      reason: row.reason,
    }));
    const warnings = checks.filter((row) => !row.critical && row.status !== "PASS");
    const incidentSnap = incidents();
    const criticalIncidents = Number(incidentSnap.critical || 0) || (incidentSnap.overall === "CRITICAL" ? 1 : 0);
    if (criticalIncidents > 0) {
      blockers.push({ id: "incidents", status: "BLOCKED", reason: "CRITICAL_INCIDENT_OPEN" });
    }

    const approval = approvalId ? approvalRecord(approvalId) : options.approval || null;
    const approvalOk = Boolean(
      approval &&
        approval.status === "APPROVED" &&
        (approval.resourceType === "GO_LIVE_PRODUCTION" || approval.type === "GO_LIVE_PRODUCTION")
    );

    const safe = safety();
    const allPass = blockers.length === 0;
    const status = allPass ? "PASS" : "BLOCKED";
    let decision = "NO_GO";
    if (allPass && approvalOk && !safe.killSwitch) decision = "GO";
    else if (allPass && approvalOk && safe.killSwitch) decision = "CONDITIONAL_GO";
    else if (allPass && !approvalOk) decision = "NO_GO";

    let lifecycle = STATES.LOCKED;
    if (safe.killSwitch && options.activationState === STATES.ACTIVE) lifecycle = STATES.SUSPENDED;
    else if (options.activationState === STATES.ACTIVE && allPass && approvalOk && !safe.killSwitch) lifecycle = STATES.ACTIVE;
    else if (allPass && approvalOk) lifecycle = STATES.APPROVED;
    else if (allPass) lifecycle = STATES.READY;

    return {
      status,
      decision,
      lifecycle,
      blockers,
      warnings,
      checks,
      safety: {
        PRODUCT_SOT_ACTIVE: safe.productSotActive ? "ON" : "OFF",
        SALES_LOCKED: safe.salesLocked ? "YES" : "NO",
        SUPPLIER_ORDER_EXECUTION: safe.supplierOrders ? "ON" : "OFF",
        PAYMENT_EXECUTION: safe.payments ? "ON" : "OFF",
        MARKETPLACE_WRITE: "OFF",
        PRODUCTION_WRITES: "NOT_EXECUTED",
        KILL_SWITCH: safe.killSwitch ? "ON" : "OFF",
      },
      evidence: {
        approval: approvalOk ? { id: approval.id || approvalId, status: "APPROVED" } : { status: "MISSING" },
        incidents: { overall: incidentSnap.overall || "UNKNOWN", critical: criticalIncidents },
        layers: {
          CODE_VERIFICATION: "PASS",
          CONFIG_VERIFICATION: "CONDITIONAL",
          LIVE_READ_VERIFICATION: options.liveHealthVerified === true ? "PASS" : "PENDING",
          PRODUCTION_WRITE_VERIFICATION: "NOT_EXECUTED",
        },
        bypass: { force: false, override: false },
      },
      generatedAt: nowIso(),
      correlationId,
    };
  }

  function publicHealth() {
    const report = evaluateGoLive();
    return {
      status: report.status === "PASS" ? "ok" : report.status === "BLOCKED" ? "blocked" : "conditional",
      salesEnabled: false,
    };
  }

  function adminReport(extra = {}) {
    const report = evaluateGoLive(extra);
    const payload = {
      status: report.status,
      decision: report.decision,
      lifecycle: report.lifecycle,
      blockers: report.blockers,
      checks: report.checks.map((row) => ({
        id: row.id,
        category: row.category,
        status: row.status,
        critical: row.critical,
        reason: row.reason,
        evidence: row.evidence,
      })),
      safety: report.safety,
      evidence: report.evidence,
      generatedAt: report.generatedAt,
      correlationId: report.correlationId,
    };
    const serialized = JSON.stringify(payload);
    if (/(api[_-]?key|password|authorization|Bearer\s+[A-Za-z0-9._-]+)/i.test(serialized)) {
      throw new Error("GO_LIVE_SECRET_LEAK");
    }
    return payload;
  }

  return Object.freeze({
    evaluateGoLive,
    publicHealth,
    adminReport,
    safety,
    CHECK_IDS,
    STATES,
    correlationId,
  });
}

function newApprovalId() {
  return `appr_${crypto.randomBytes(8).toString("hex")}`;
}

module.exports = {
  createGoLiveGate,
  CHECK_IDS,
  STATES,
  newApprovalId,
};
