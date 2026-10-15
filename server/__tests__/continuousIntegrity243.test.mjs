import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

const LEAKY = /error:\s*(err|error)\.message/;

describe("batch publicTaskError fail-closed", () => {
  it("clears exception classify.message of raw exception text", () => {
    const pusat = require("../lib/pusat");
    const classified = pusat.exceptions.classify(
      new Error("SQLITE_ERROR: no such table /var/data/x.db"),
      { action: "prices.update" }
    );
    expect(classified.message).toBe(classified.code);
    expect(classified.message).not.toContain("SQLITE");
    expect(classified.message).not.toContain("/var/data");
  });

  it("wraps supplier errors as codes only", () => {
    const { wrapError, SUPPLIER_ERROR_CODE } = require("../lib/supplier/supplierErrors.js");
    const wrapped = wrapError(new Error("ECONNRESET /etc/passwd token=sk_live_abc"), "sup-1");
    expect(wrapped.message).toBe(wrapped.code);
    expect(JSON.stringify(wrapped)).not.toContain("sk_live_abc");
    expect(JSON.stringify(wrapped)).not.toContain("/etc/passwd");
    expect(Object.values(SUPPLIER_ERROR_CODE)).toContain(wrapped.code);
  });

  it("does not put exception text on identity/tracking failure objects", () => {
    const identity = require("../lib/software/orderIdentity.js");
    const tracking = require("../lib/software/tracking.js");
    const srcId = fs.readFileSync(path.join(__dirname, "../lib/software/orderIdentity.js"), "utf8");
    const srcTr = fs.readFileSync(path.join(__dirname, "../lib/software/tracking.js"), "utf8");
    expect(srcId).toMatch(/IDENTITY_BIND_FAILED/);
    expect(srcTr).toMatch(/SHIPMENT_WRITE_FAILED/);
    expect(srcId).not.toMatch(LEAKY);
    expect(srcTr).not.toMatch(LEAKY);
    expect(typeof identity.ensureBound).toBe("function");
    expect(typeof tracking.createShipment).toBe("function");
  });

  it("source-scans high-risk modules for error.message returns", () => {
    const files = [
      "../lib/pusat/worker.js",
      "../lib/pusat/automations.js",
      "../lib/software/returns.js",
      "../lib/supplierHub.js",
      "../lib/pim/bulkOperations.js",
      "../lib/importPipeline.js",
      "../lib/taxonomyCanonical.js",
      "../lib/backupAutomation.js",
      "../lib/priceStockQueue.js",
      "../lib/commerce/legacyPimMigration.js",
      "../lib/db.js",
      "../server.js",
      "../lib/orderManagement.js",
      "../lib/commerce/orderService.js",
      "../lib/orchestratorBridge.js",
      "../lib/guardianBridge.js",
      "../lib/intelligenceBridge.js",
      "../lib/aiProviders.js",
      "../lib/software/supplierFeeds.js",
    ];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(__dirname, rel), "utf8");
      expect(src, rel).not.toMatch(LEAKY);
    }
  });
});
