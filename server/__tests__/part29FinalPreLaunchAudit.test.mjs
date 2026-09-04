import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  getFinalPreLaunchAudit,
  validateFinalPreLaunchAudit,
  buildPart29Gates,
} = require("../lib/release/finalPreLaunchAudit.js");
const { auditFinalPreLaunch } = require("../lib/release/finalPreLaunchAuditLog.js");
const { PART29_GATES } = require("../core/part29PreLaunchAuditConstants.js");

function resetSafeEnv() {
  process.env.BUZZARD_SALES_ENABLED = "0";
  process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  process.env.REAL_SUPPLIER_DRY_RUN = "1";
  delete process.env.REAL_SUPPLIER_API_KEY;
}

test("Part 29 returns BLOCKED before human approval", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.ready, false);
  assert.equal(result.status, "BLOCKED");
});

test("Part 29 is diagnostic only", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.autoActivate, false);
});

test("Sales remain disabled", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.salesEnabled, false);
  assert.equal(result.publicSalesEnabled, false);
});

test("Supplier remains disconnected", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.supplierLive, false);
  assert.equal(result.safety.supplierOrdersBlocked, true);
});

test("Supplier API is not called", async () => {
  resetSafeEnv();
  const result = await validateFinalPreLaunchAudit();
  assert.equal(result.supplierCallPerformed, false);
});

test("Live import remains disabled", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.safety.supplierLiveImport, false);
});

test("Dry run remains enabled", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.safety.supplierDryRun, true);
});

test("Stripe remains disabled", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.payments.stripe, false);
});

test("PayPal remains disabled", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.payments.paypal, false);
});

test("Publishing remains disabled", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.publishing.enabled, false);
  assert.equal(result.publishing.publicProducts, 0);
});

test("Human approval is required", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.humanApprovalRequired, true);
  assert.equal(result.activationAllowed, false);
});

test("Human pre-launch approval gate is blocking", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  const gate = result.gates.find((item) => item.name === "humanPreLaunchApproval");
  assert.ok(gate);
  assert.equal(gate.ok, false);
  assert.equal(gate.status, "BLOCKED");
});

test("Configuration gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "configuration"));
});

test("Security readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "security"));
});

test("Monitoring readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "monitoring"));
});

test("Incident readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "incidentReadiness"));
});

test("Backup readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "backupReadiness"));
});

test("Database readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "databaseReadiness"));
});

test("Worker readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "workerReadiness"));
});

test("Product quality gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "productQuality"));
});

test("Supplier readiness remains verification only", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  const gate = result.gates.find((item) => item.name === "supplierReadiness");
  assert.ok(gate);
  assert.equal(gate.verificationOnly, true);
  assert.equal(gate.connected, false);
});

test("Payment readiness remains verification only", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  const gate = result.gates.find((item) => item.name === "paymentReadiness");
  assert.ok(gate);
  assert.equal(gate.verificationOnly, true);
});

test("Commerce readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "commerceReadiness"));
});

test("Release readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "releaseReadiness"));
});

test("Rollback readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "rollbackReadiness"));
});

test("Operational finalization gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "operationalFinalization"));
});

test("Final go-live readiness gate exists", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.ok(result.gates.some((item) => item.name === "finalGoLiveReadiness"));
});

test("Part 29 defines all required gates", async () => {
  resetSafeEnv();
  const gates = await buildPart29Gates();
  for (const name of PART29_GATES) {
    assert.ok(gates.some((item) => item.name === name), `missing gate ${name}`);
  }
});

test("Validation performs no mutation", async () => {
  resetSafeEnv();
  const result = await validateFinalPreLaunchAudit();
  assert.equal(result.validationOnly, true);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.publishPerformed, false);
  assert.equal(result.salesActivationPerformed, false);
  assert.equal(result.goLiveLockRemoved, false);
});

test("Audit never exposes secrets", async () => {
  resetSafeEnv();
  const result = await auditFinalPreLaunch();
  assert.equal(result.secretsExposed, false);
  assert.equal(result.readOnly, true);
});

test("Audit remains blocked before approval", async () => {
  resetSafeEnv();
  const result = await auditFinalPreLaunch();
  assert.equal(result.ready, false);
  assert.equal(result.status, "BLOCKED");
});

test("Final activation is never allowed automatically", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.autoActivate, false);
  assert.equal(result.activationAllowed, false);
});

test("Part 29 has no supplier activation capability", async () => {
  resetSafeEnv();
  const result = await validateFinalPreLaunchAudit();
  assert.equal(result.supplierCallPerformed, false);
  assert.equal(result.paymentCallPerformed, false);
});

test("Final result is fail-closed", async () => {
  resetSafeEnv();
  const result = await getFinalPreLaunchAudit();
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length > 0);
});

test("RBAC public health route is public", () => {
  const { resolveRoutePermission } = require("../lib/routePermissions.js");
  assert.equal(resolveRoutePermission("GET", "/api/health/final-prelaunch-readiness").public, true);
});

test("RBAC admin final prelaunch routes require system.read", () => {
  const { resolveRoutePermission } = require("../lib/routePermissions.js");
  assert.equal(resolveRoutePermission("GET", "/api/admin/release/final-prelaunch").permission, "system.read");
  assert.equal(
    resolveRoutePermission("POST", "/api/admin/release/final-prelaunch/validate").permission,
    "system.read"
  );
});
