import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, describe, expect, it } from "vitest";

const root = mkdtempSync(path.join(tmpdir(), "buzzard-item69-"));
process.env.BUZZARD_DB_PATH = path.join(root, "local.sqlite");
process.env.BUZZARD_SALES_ENABLED = "0";
process.env.BUZZARD_PAYMENT_ENABLED = "1";
process.env.BUZZARD_PRODUCT_SOT_ACTIVE = "1";
delete process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE;

const require = createRequire(import.meta.url);
const Database = createRequire(path.join(__dirname, "../package.json"))("better-sqlite3");
const { isEnabled } = require("../lib/pimCatalog");
const { getEffectiveFlags } = require("../lib/commerce/commerceFeatureFlags");
const { evaluateSalesGate } = require("../lib/salesSafetyGate");
const { createSinanDurable } = require("../lib/pusat/sinanDurable");
const { runDryRun } = require("../lib/logistics/v5/operationsPlane");

const repoRoot = path.resolve(__dirname, "../..");

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("items 69-86 local catalog boundaries", () => {
  it("keeps search sync and translation fill local", () => {
    const sync = readFileSync(path.join(repoRoot, "scripts/sync-search-index.mjs"), "utf8");
    expect(sync).toContain("srch_products");
    expect(sync.toLowerCase()).not.toContain("opensearch");
    const fill = readFileSync(path.join(repoRoot, "scripts/fill-product-i18n-gaps.mjs"), "utf8");
    expect(fill).toContain("--dry-run");
    expect(fill).toContain("Does not modify images");
    expect(isEnabled()).toBe(true);
    const plugin = readFileSync(path.join(repoRoot, "server/plugins/pimCatalogPlugin.js"), "utf8");
    expect(plugin).not.toContain("/api/pim-catalog/health");
  });

  it("refuses live verification and keeps payment and sales locked", () => {
    const db = new Database(path.join(root, "sinan.sqlite"));
    const desk = createSinanDurable(db);
    const task = desk.assignTask({ fromId: "pusat", title: "local" });
    expect(desk.setStatus({ taskId: task.id, status: "LIVE_VERIFIED" }).code).toBe("LIVE_VERIFIED_FORBIDDEN");
    db.close();
    const flags = getEffectiveFlags();
    expect(flags.paymentEnabled).toBe(false);
    expect(flags.salesEnabled).toBe(false);
    expect(flags.violations.some((row) => row.flag === "BUZZARD_PAYMENT_ENABLED")).toBe(true);
    expect(evaluateSalesGate().locked).toBe(true);
    const dry = runDryRun({ destination: "DE" });
    expect(dry.humanApprovalRequired).toBe(true);
    expect(dry.live).toBe(false);
    expect(dry.boundToRealOrders).toBe(false);
  });

  it("keeps warehouse reservations apart from the software reservation table", () => {
    const db = new Database(process.env.BUZZARD_DB_PATH);
    const names = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map((row) => row.name);
    expect(names).toContain("wms_reservations");
    expect(names).toContain("inventory_sot_reservations");
    db.close();
  });
});
