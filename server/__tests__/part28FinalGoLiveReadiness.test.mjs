import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  getFinalGoLiveReadiness,
  validateFinalGoLiveReadiness,
} = require("../lib/release/finalGoLiveReadiness.js");
const { auditFinalGoLive } = require("../lib/release/finalGoLiveAudit.js");

function resetSafeEnv() {
  process.env.BUZZARD_SALES_ENABLED = "0";
  process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  process.env.REAL_SUPPLIER_DRY_RUN = "1";
  delete process.env.REAL_SUPPLIER_API_KEY;
}

test("Part 28 returns BLOCKED before human approval", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.ready, false);
  assert.equal(result.status, "BLOCKED");
});

test("Part 28 is diagnostic only", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.autoActivate, false);
});

test("Sales remain disabled", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.salesEnabled, false);
  assert.equal(result.publicSalesEnabled, false);
});

test("Supplier remains disconnected", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.supplierLive, false);
  assert.equal(result.supplierOrdersBlocked, true);
});

test("Supplier API is not called", () => {
  resetSafeEnv();
  const result = validateFinalGoLiveReadiness();
  assert.equal(result.supplierCallPerformed, false);
});

test("Live import remains disabled", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.safety.supplierLiveImport, false);
});

test("Dry run remains enabled", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.safety.supplierDryRun, true);
});

test("Stripe remains disabled", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.payments.stripe, false);
});

test("PayPal remains disabled", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.payments.paypal, false);
});

test("Publishing remains disabled", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.publishing.enabled, false);
  assert.equal(result.publishing.publicProducts, 0);
});

test("Human approval is required", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.humanApprovalRequired, true);
  assert.equal(result.activationAllowed, false);
});

test("Human approval gate is blocking", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  const gate = result.gates.find((item) => item.name === "humanGoLiveApproval");
  assert.ok(gate);
  assert.equal(gate.ok, false);
  assert.equal(gate.status, "BLOCKED");
});

test("Environment safety gate passes in safe state", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  const gate = result.gates.find((item) => item.name === "environmentSafety");
  assert.ok(gate);
  assert.equal(gate.ok, true);
});

test("Security readiness gate exists", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.ok(result.gates.some((item) => item.name === "securityReadiness"));
});

test("Product quality readiness gate exists", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.ok(result.gates.some((item) => item.name === "productQualityReadiness"));
});

test("Supplier integration readiness remains non-live", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  const gate = result.gates.find((item) => item.name === "supplierIntegrationReadiness");
  assert.ok(gate);
  assert.equal(gate.liveIntegration, false);
});

test("Validation performs no mutation", () => {
  resetSafeEnv();
  const result = validateFinalGoLiveReadiness();
  assert.equal(result.validationOnly, true);
  assert.equal(result.mutationPerformed, false);
  assert.equal(result.publishPerformed, false);
  assert.equal(result.salesActivationPerformed, false);
});

test("Audit never exposes secrets", () => {
  resetSafeEnv();
  const result = auditFinalGoLive();
  assert.equal(result.secretsExposed, false);
  assert.equal(result.readOnly, true);
});

test("Audit remains blocked before approval", () => {
  resetSafeEnv();
  const result = auditFinalGoLive();
  assert.equal(result.ready, false);
  assert.equal(result.status, "BLOCKED");
});

test("Final activation is never allowed automatically", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.autoActivate, false);
  assert.equal(result.activationAllowed, false);
});

test("Part 28 has no supplier activation capability", () => {
  resetSafeEnv();
  const result = validateFinalGoLiveReadiness();
  assert.equal(result.supplierCallPerformed, false);
  assert.equal(result.paymentCallPerformed, false);
});

test("Final result is fail-closed", () => {
  resetSafeEnv();
  const result = getFinalGoLiveReadiness();
  assert.equal(result.ready, result.blockers.length === 0);
});

test("RBAC public health route is public", () => {
  const { resolveRoutePermission } = require("../lib/routePermissions.js");
  assert.equal(resolveRoutePermission("GET", "/api/health/final-go-live-readiness").public, true);
});

test("RBAC admin final go-live routes require system.read", () => {
  const { resolveRoutePermission } = require("../lib/routePermissions.js");
  assert.equal(resolveRoutePermission("GET", "/api/admin/release/final-go-live").permission, "system.read");
  assert.equal(resolveRoutePermission("POST", "/api/admin/release/final-go-live/validate").permission, "system.read");
});
