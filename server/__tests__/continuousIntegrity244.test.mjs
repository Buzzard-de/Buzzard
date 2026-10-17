import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

const LEAKY_ASSIGN = /(detail|reason|lastError|error)\s*:\s*(err|error)\.message/;

describe("health/readiness publicTaskError fail-closed", () => {
  it("source-scans remaining API-visible modules for err.message payloads", () => {
    const files = [
      "../lib/controlCenter.js",
      "../lib/dbStartup.js",
      "../lib/dbIntegrity.js",
      "../lib/rateLimitStore.js",
      "../lib/automationEngine.js",
      "../lib/commerce/commerceReadiness.js",
      "../lib/integrationHealth.js",
      "../lib/supplier/supplierSafetyGate.js",
      "../lib/operations/adminSafetyGate.js",
      "../lib/customer/customerNotificationReadiness.js",
      "../lib/categoryReadiness.js",
      "../lib/storefront/syncStatus.js",
      "../plugins/productionHealthPlugin.js",
      "../lib/operations/goLiveReadiness.js",
      "../lib/operations/monitoringReadiness.js",
    ];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(__dirname, rel), "utf8");
      expect(src, rel).not.toMatch(LEAKY_ASSIGN);
      expect(src, rel).not.toMatch(/errors\.push\(err\.message\)/);
      expect(src, rel).not.toMatch(/errors\[0\]\?\.message/);
    }
  });

  it("rate-limit store info omits persist path and keys redis errors", () => {
    const { getStoreInfo } = require("../lib/rateLimitStore.js");
    const info = getStoreInfo();
    expect(info).not.toHaveProperty("persistFile");
    expect(info).toHaveProperty("persistEnabled");
    expect(JSON.stringify(info)).not.toMatch(/rate-limit-buckets\.json/);
    const src = fs.readFileSync(path.join(__dirname, "../lib/rateLimitStore.js"), "utf8");
    expect(src).toMatch(/rateLimit\.redis_failed/);
    expect(src).toMatch(/publicTaskError/);
  });

  it("admin safety gate stores production_safety_blocked instead of exception text", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/operations/adminSafetyGate.js"), "utf8");
    expect(src).toMatch(/production_safety_blocked/);
    expect(src).toMatch(/publicTaskError/);
    const { publicTaskError } = require("../lib/security.js");
    const err = new Error("Production safety check failed: /var/data/buzzard.db SQLITE");
    err.code = "production_safety_blocked";
    expect(publicTaskError(err, "production_safety_blocked")).toBe("production_safety_blocked");
    expect(publicTaskError(err, "production_safety_blocked")).not.toContain("/var/data");
  });

  it("checkout sqlite-store catch uses a stable errorKey", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../lib/orders/client.ts"), "utf8");
    expect(src).toMatch(/errorKey:\s*"checkout\.apiUnavailable"/);
    expect(src).not.toMatch(/err\.message/);
  });

  it("commerce readiness catch returns a key, not exception text", () => {
    const commerceReadiness = require("../lib/commerce/commerceReadiness.js");
    const { publicTaskError } = require("../lib/security.js");
    const poisoned = new Error("ECONNREFUSED 127.0.0.1:5432 password=secret");
    expect(publicTaskError(poisoned, "commerce.check_failed")).toBe("commerce.check_failed");
    const gate = commerceReadiness.runReadinessGate();
    expect(gate.salesBlocked).toBe(true);
    const blob = JSON.stringify(gate);
    expect(blob).not.toMatch(/password=/);
    expect(blob).not.toMatch(/ECONNREFUSED/);
  });

  it("notification emit fail-closed reason is a key when order missing", () => {
    const notif = require("../lib/customer/customerNotificationReadiness.js");
    expect(notif.emitCheckoutNotification({})).toEqual({ ok: false, reason: "missing_order" });
  });

  it("monitoring snapshot does not expose backup directory paths", async () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/operations/monitoringReadiness.js"), "utf8");
    expect(src).toMatch(/dirExists/);
    expect(src).not.toMatch(/dir:\s*backup\.backupDir/);
    expect(src).toMatch(/config\.errors\[0\]\?\.code/);
  });
});
