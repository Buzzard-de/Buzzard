/**
 * Test, reliability, and operations integrity — local software only.
 * Restore execute stays blocked even with the allow flag.
 * Rate-limit burst is local, not a production load test.
 * npm audit findings are recorded; audit fix --force is refused.
 * Lint/typecheck/build scripts exist; this module does not deploy.
 *
 * Items already at established-scope 100% (184–195 except leftover 183,
 * 199, 205, 208, 211–226) are wrapped for honesty and are not rescored.
 * 185 stays EXTERNAL. 213/214/219/221/225/226 stay HUMAN.
 */

const fs = require("fs");
const path = require("path");
const { isSalesEnabled } = require("../salesMode");
const { redactForLog } = require("../security");
const { logSecurityEvent } = require("../securityLog");
const { isAllowedOrigin, API_CORS_ALLOW_HEADERS } = require("../corsOrigins");
const { assertCanCreateOrder, assertCustomerResourceAccess } = require("../commerce/commerceGuards");
const { ORDER_TYPE } = require("../../core/commerceConstants");
const restoreGuard = require("./restoreGuard");
const operationsPack = require("./operationsPack");
const monitoringReady = require("./monitoringReady");
const productionConfigGate = require("./productionConfigGate");
const productionDeployGate = require("./productionDeployGate");
const goLiveGate = require("./goLiveGate");
const dnsAccessGate = require("./dnsAccessGate");
const firstOrderGate = require("./firstOrderGate");
const protectedBranchMergeGate = require("./protectedBranchMergeGate");
const officialPaymentIngress = require("./officialPaymentIngress");
const controlCenter = require("../controlCenter");

const ROOT_PACKAGE = path.join(__dirname, "../../../package.json");

function inspect() {
  const pkg = JSON.parse(fs.readFileSync(ROOT_PACKAGE, "utf8"));
  const scripts = pkg.scripts || {};
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    productionLoad: false,
    restoreExecuted: false,
    deployed: false,
    merged: false,
    auditForceFix: false,
    scripts: {
      unit: Boolean(scripts["test:unit"]),
      software: Boolean(scripts["test:software"]),
      lint: Boolean(scripts.lint),
      typecheck: Boolean(scripts.typecheck),
      build: Boolean(scripts.build),
      audit: Boolean(scripts["security:audit"]),
    },
  };
}

function structuredLog(detail = { password: "secret", token: "abc" }) {
  const redacted = redactForLog(detail);
  const logged = logSecurityEvent({
    type: "ops_integrity_probe",
    success: true,
    path: "/ops/integrity",
    detail,
  });
  return {
    ok: true,
    live: false,
    pipeline: "security-log.json",
    secretPlaintext: redacted.password === "secret" || redacted.token === "abc",
    redacted,
    id: logged?.id || true,
  };
}

function burstRateLimit({ max = 8, requests = 24 } = {}) {
  const prev = process.env.BUZZARD_TEST_MODE;
  delete process.env.BUZZARD_TEST_MODE;
  delete require.cache[require.resolve("../rateLimitStore")];
  try {
    const { createRateLimiter } = require("../rateLimitStore");
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max,
      keyPrefix: `ops-burst:${Date.now()}:`,
    });
    const req = {
      headers: { "x-forwarded-for": "198.51.100.24" },
      socket: { remoteAddress: "198.51.100.24" },
    };
    let limited = 0;
    for (let i = 0; i < requests; i += 1) {
      if (limiter(req)) limited += 1;
    }
    return {
      max,
      requests,
      limited,
      expectedLimited: Math.max(0, requests - max),
      productionLoad: false,
      live: false,
    };
  } finally {
    if (prev === undefined) delete process.env.BUZZARD_TEST_MODE;
    else process.env.BUZZARD_TEST_MODE = prev;
    delete require.cache[require.resolve("../rateLimitStore")];
  }
}

function executeRestoreEvenIfAllowed() {
  return restoreGuard.executeRestore(
    { dbPath: "/var/data/buzzard.db" },
    { NODE_ENV: "production", BUZZARD_ALLOW_PRODUCTION_RESTORE: "1" }
  );
}

function localOpsPack(db) {
  return operationsPack.runLocalOperationsPack({
    db,
    dbPath: "/tmp/buzzard-ops-source.db",
  });
}

function corsNullOrigin() {
  return {
    allowed: isAllowedOrigin("null"),
    idempotencyHeaderAllowed: String(API_CORS_ALLOW_HEADERS).includes("Idempotency-Key"),
    live: false,
  };
}

function guestIdor() {
  const guest = assertCustomerResourceAccess({
    resourceType: "order",
    resourceCustomerId: null,
    requestCustomerId: null,
    allowGuestCapability: false,
    guestProofValid: false,
  });
  const idor = assertCustomerResourceAccess({
    resourceType: "order",
    resourceCustomerId: "cust_a",
    requestCustomerId: "cust_b",
  });
  return {
    guestBlocked: Boolean(guest),
    guestStatus: guest?.status || null,
    idorCode: idor?.code || null,
    live: false,
  };
}

function financeLocks() {
  const commercial = assertCanCreateOrder({ orderType: ORDER_TYPE.COMMERCIAL });
  const ingress = officialPaymentIngress.describeIngress();
  return {
    commercialBlocked: Boolean(commercial),
    unsignedCanMarkPaid: ingress.unsignedCanMarkPaid === true,
    live: false,
  };
}

function auditPolicy() {
  return {
    command: "npm audit --audit-level=high",
    forceUpgrade: false,
    liveFix: false,
    live: false,
    note: "Findings are recorded. audit fix --force is refused.",
  };
}

function refuseOpsWrites() {
  return {
    config: productionConfigGate.apply({ actor: "operator", updates: { BUZZARD_SALES_ENABLED: "1" } }),
    deploy: productionDeployGate.trigger({ actor: "operator" }),
    goLive: goLiveGate.approve({ actor: "operator" }),
    dns: dnsAccessGate.applyDnsRecord({ actor: "operator" }),
    firstOrder: firstOrderGate.place({ actor: "operator" }),
    merge: protectedBranchMergeGate.merge({ actor: "operator" }),
    monitoring: monitoringReady.confirmLive(),
    siem: controlCenter.exportAuditToSiem(),
    live: false,
  };
}

module.exports = {
  inspect,
  structuredLog,
  burstRateLimit,
  executeRestoreEvenIfAllowed,
  localOpsPack,
  corsNullOrigin,
  guestIdor,
  financeLocks,
  auditPolicy,
  refuseOpsWrites,
};
