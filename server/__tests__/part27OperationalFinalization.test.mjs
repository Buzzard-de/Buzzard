import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  evaluateEnvironmentSafety,
  buildPart27Readiness,
  buildPart27Audit,
} = require("../lib/operations/part27OperationalFinalization.js");

test("Part 27 readiness is diagnostic only", () => {
  const result = buildPart27Readiness();
  assert.equal(result.diagnosticOnly, true);
  assert.equal(result.autoActivate, false);
});

test("sales remain disabled", () => {
  const result = buildPart27Readiness();
  assert.equal(result.salesEnabled, false);
  assert.equal(result.safety.sales, false);
});

test("supplier live import remains disabled", () => {
  const result = buildPart27Readiness();
  assert.equal(result.supplierLive, false);
  assert.equal(result.safety.liveImport, false);
});

test("publish remains disabled", () => {
  const result = buildPart27Readiness();
  assert.equal(result.safety.publish, false);
});

test("payments remain disabled", () => {
  const result = buildPart27Readiness();
  assert.equal(result.safety.payments, false);
});

test("supplier orders remain blocked", () => {
  const result = buildPart27Readiness();
  assert.equal(result.safety.supplierOrdersBlocked, true);
});

test("safe environment passes with defaults", () => {
  const result = evaluateEnvironmentSafety({
    BUZZARD_SALES_ENABLED: "0",
    NEXT_PUBLIC_SALES_ENABLED: "0",
    REAL_SUPPLIER_LIVE_IMPORT: "0",
    REAL_SUPPLIER_DRY_RUN: "1",
    PRODUCTION_SAFETY_LOCK: "true",
  });
  assert.equal(result.status, "READY");
});

test("sales activation is blocked", () => {
  const result = evaluateEnvironmentSafety({
    BUZZARD_SALES_ENABLED: "1",
    NEXT_PUBLIC_SALES_ENABLED: "0",
    REAL_SUPPLIER_LIVE_IMPORT: "0",
    REAL_SUPPLIER_DRY_RUN: "1",
    PRODUCTION_SAFETY_LOCK: "true",
  });
  assert.equal(result.status, "BLOCKED");
});

test("live supplier import is blocked", () => {
  const result = evaluateEnvironmentSafety({
    BUZZARD_SALES_ENABLED: "0",
    NEXT_PUBLIC_SALES_ENABLED: "0",
    REAL_SUPPLIER_LIVE_IMPORT: "1",
    REAL_SUPPLIER_DRY_RUN: "1",
    PRODUCTION_SAFETY_LOCK: "true",
  });
  assert.equal(result.status, "BLOCKED");
});

test("audit never exposes secrets", () => {
  const readiness = buildPart27Readiness();
  const audit = buildPart27Audit(readiness);
  assert.equal(audit.secretsExposed, false);
});

test("readiness is never automatically activated", () => {
  const result = buildPart27Readiness();
  assert.equal(result.autoActivate, false);
});

test("part number is 27", () => {
  const result = buildPart27Readiness();
  assert.equal(result.part, 27);
});

test("all 15 gates returned", () => {
  const result = buildPart27Readiness();
  assert.equal(Object.keys(result.gates).length, 15);
});

test("go-live approval gate is BLOCKED", () => {
  const result = buildPart27Readiness();
  assert.equal(result.gates.goLiveApproval.status, "BLOCKED");
});

test("supplier safety gate is READY without credentials", () => {
  process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  process.env.REAL_SUPPLIER_DRY_RUN = "1";
  delete process.env.REAL_SUPPLIER_API_KEY;
  const result = buildPart27Readiness();
  assert.equal(result.gates.supplierSafety.status, "READY");
  assert.equal(result.gates.supplierSafety.connected, false);
});

test("commerce safety gate is READY with sales OFF", () => {
  process.env.BUZZARD_SALES_ENABLED = "0";
  process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  const result = buildPart27Readiness();
  assert.equal(result.gates.commerceSafety.status, "READY");
});

test("RBAC public route is public", () => {
  const { resolveRoutePermission } = require("../lib/routePermissions.js");
  assert.equal(resolveRoutePermission("GET", "/api/health/part27-readiness").public, true);
});

test("RBAC admin routes require permissions", () => {
  const { resolveRoutePermission } = require("../lib/routePermissions.js");
  assert.equal(resolveRoutePermission("GET", "/api/admin/operations/part27-readiness").permission, "system.read");
  assert.equal(resolveRoutePermission("GET", "/api/admin/operations/part27-audit").permission, "audit.read");
});
