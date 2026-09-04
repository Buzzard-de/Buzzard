import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { evaluateReleaseSafety } = require("../lib/release/releaseSafetyGate.js");
const { buildReleaseReadiness } = require("../lib/release/releaseReadiness.js");
const { evaluateRollbackReadiness } = require("../lib/release/releaseRollbackReadiness.js");
const { buildReleaseManifest } = require("../lib/release/releaseManifest.js");

const SAFE_ENV = {
  BUZZARD_SALES_ENABLED: "0",
  NEXT_PUBLIC_SALES_ENABLED: "0",
  PRODUCTION_SAFETY_LOCK: "true",
  REAL_SUPPLIER_LIVE_IMPORT: "0",
  REAL_SUPPLIER_DRY_RUN: "1",
};

test("release safety passes with safe defaults", () => {
  const result = evaluateReleaseSafety(SAFE_ENV);
  assert.equal(result.status, "PASS");
  assert.equal(result.salesDisabled, true);
  assert.equal(result.productionSafetyLock, true);
  assert.equal(result.liveSupplierImportDisabled, true);
  assert.equal(result.supplierDryRun, true);
});

test("release safety fails when sales are enabled", () => {
  const result = evaluateReleaseSafety({
    ...SAFE_ENV,
    BUZZARD_SALES_ENABLED: "1",
  });
  assert.equal(result.status, "FAIL");
});

test("release safety fails when live supplier import is enabled", () => {
  const result = evaluateReleaseSafety({
    ...SAFE_ENV,
    REAL_SUPPLIER_LIVE_IMPORT: "1",
  });
  assert.equal(result.status, "FAIL");
});

test("release readiness never auto activates", () => {
  const result = buildReleaseReadiness({
    tests: { allPassed: true },
    configuration: { valid: true },
    database: { ready: true },
    observability: { ready: true },
    rollback: { ready: true },
    env: SAFE_ENV,
  });
  assert.equal(result.autoActivate, false);
  assert.equal(result.salesActivationAllowed, false);
  assert.equal(result.supplierActivationAllowed, false);
  assert.equal(result.paymentActivationAllowed, false);
});

test("go-live remains blocked pending human approval", () => {
  const result = buildReleaseReadiness({
    tests: { allPassed: true },
    configuration: { valid: true },
    database: { ready: true },
    observability: { ready: true },
    rollback: { ready: true },
    env: SAFE_ENV,
  });
  const goLive = result.gates.find((item) => item.name === "goLive");
  assert.equal(goLive.status, "BLOCKED");
});

test("rollback requires a previous release", () => {
  const result = evaluateRollbackReadiness({ previousRelease: null });
  assert.equal(result.ready, false);
});

test("rollback is ready with a previous release", () => {
  const result = evaluateRollbackReadiness({
    previousRelease: "abc123",
    databaseRollback: true,
    configurationRollback: true,
  });
  assert.equal(result.ready, true);
});

test("release manifest disables live actions", () => {
  const manifest = buildReleaseManifest({ version: "part24", commit: "test" });
  assert.equal(manifest.supplierLiveImport, false);
  assert.equal(manifest.salesEnabled, false);
  assert.equal(manifest.paymentActivation, false);
});

test("readiness exposes twelve gates", () => {
  const result = buildReleaseReadiness({
    tests: { allPassed: true },
    env: SAFE_ENV,
  });
  assert.equal(result.gates.length, 12);
});

test("supplier remains disconnected", () => {
  const result = buildReleaseReadiness({
    tests: { allPassed: true },
    env: SAFE_ENV,
  });
  const supplier = result.gates.find((item) => item.name === "supplier");
  assert.equal(supplier.details, undefined);
  assert.equal(supplier.connected, false);
  assert.equal(supplier.liveImportAllowed, false);
});
