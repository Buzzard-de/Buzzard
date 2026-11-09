import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { smokeFetch, isProductionRuntime } = require("../lib/security/smokeHttp.js");
const { evaluateEgress, SHARED } = require("../lib/security/egressPolicy.js");
const { assertSafeSpawn } = require("../lib/security/spawnGuard.js");
const { createDurableTaskQueue, assertNotGuardian } = require("../lib/pusat/durableTaskQueue.js");
const { inventory } = require("../lib/buzzardNative/core/specialistInventory.js");
const { validateTaxonomy } = require("../lib/taxonomy/validateTaxonomy.js");
const { runConnected } = require("../lib/commerce/connectedWorkflow.js");
const { calculate, applyCustomerRefund, MIN_NET } = require("../lib/finance/unifiedPricing.js");
const { split } = require("../lib/finance/taxReserves.js");
const { handle } = require("../lib/customer/banuDesk.js");
const { isolatedBackupFaults } = require("../lib/survival/isolatedBackupFaults.js");
const { createCears } = require("../lib/security/cears/engine.js");
const { createLocker } = require("../lib/security/evidenceLocker.js");
const { send } = require("../lib/comms/whatsappSandbox.js");

describe("continuation v4 smoke http", () => {
  it("defaults to isolated fetch and denies live smoke in production", async () => {
    expect(SHARED.default).toBe("DENY");
    expect(isProductionRuntime({ env: { NODE_ENV: "production" } })).toBe(true);
    await expect(
      smokeFetch("https://example.com/api/health", {}, { env: { NODE_ENV: "production", BUZZARD_LIVE_SMOKE: "1" } })
    ).rejects.toMatchObject({ code: "LIVE_SMOKE_DENIED_IN_PRODUCTION", reachedNetwork: false });
    const res = await smokeFetch("http://localhost:3001/api/health");
    expect(res.isolated).toBe(true);
    expect(res.reachedNetwork).toBe(false);
    expect(evaluateEgress({ destinationUrl: "https://127.0.0.1/" }).allowed).toBe(false);
    expect(assertSafeSpawn({ file: "/bin/sh", shell: true }).ok).toBe(false);
  });

  it("smoke scripts import smokeFetch and do not call global fetch", () => {
    const dir = path.join(root, "scripts");
    const smokes = readdirSync(dir).filter((f) => f.includes("smoke") && f.endsWith(".mjs"));
    expect(smokes.length).toBeGreaterThan(10);
    for (const f of smokes) {
      const text = readFileSync(path.join(dir, f), "utf8");
      expect(text).toContain("smokeFetch");
      expect(text).not.toMatch(/await fetch\(/);
    }
  });
});

describe("durable queue restart recovery", () => {
  it("recovers a leased task after close and prevents duplicate idempotent enqueue", () => {
    expect(() => assertNotGuardian("/tmp/buzzard_guardian.sqlite3")).toThrow(/GUARDIAN/);
    const dir = mkdtempSync(path.join(os.tmpdir(), "buzzard-orch-"));
    const dbPath = path.join(dir, "orch.sqlite");
    const q1 = createDurableTaskQueue({ dbPath });
    const made = q1.enqueue({ title: "recover-me", ownerId: "pusat", assigneeId: "sinan_bey", idempotencyKey: "rec-1" });
    const leased = q1.lease({ workerId: "w1" });
    expect(leased.task.state).toBe("RUNNING");
    q1.close();
    const q2 = createDurableTaskQueue({ dbPath });
    const recovered = q2.recoverLeases();
    expect(recovered.recovered).toBe(1);
    const again = q2.lease({ workerId: "w2" });
    expect(again.task.id).toBe(made.task.id);
    expect(q2.enqueue({ title: "recover-me", idempotencyKey: "rec-1" }).duplicate).toBe(true);
    expect(q2.complete(again.task.id).code).toBe("ACCEPTANCE_OR_TESTS_REQUIRED");
    q2.markTests(again.task.id, { testsPassed: true, acceptancePassed: true });
    expect(q2.complete(again.task.id).ok).toBe(true);
    q2.close();
  });
});

describe("council specialists and taxonomy", () => {
  it("lists 17 specialists with namespaces and does not call them LLMs", () => {
    const inv = inventory();
    expect(inv.count).toBe(17);
    expect(inv.ok).toBe(true);
    expect(inv.uniqueNamespaces).toBe(true);
    expect(inv.llmCouncil).toBe(false);
    expect(inv.executive.size).toBe(17);
  });

  it("validates taxonomy without approving REVIEW_REQUIRED or merging 492", () => {
    const v = validateTaxonomy({ root });
    expect(v.master50).toBe(50);
    expect(v.approvedReviewRows).toBe(false);
    expect(v.mergedPr492).toBe(false);
    expect(v.translationsComplete).toBe(false);
  });
});

describe("connected commerce and finance", () => {
  it("runs happy path and failure scenarios without live payment", () => {
    const happy = runConnected("happy");
    expect(happy.engines).toBe(11);
    expect(happy.live).toBe(false);
    expect(runConnected("duplicate_order").events[1].code).toBe("DUPLICATE_ORDER");
    expect(runConnected("failed_payment").events[0].sent).toBe(false);
    expect(runConnected("supplier_refuses_reimbursement").events[0].assumed).toBe(false);
    const partial = runConnected("partial_refund");
    expect(partial.actualProfit).toBe(9);
    expect(partial.consistent).toBe(true);
    expect(runConnected("insufficient_profit").live).toBe(false);
  });

  it("keeps refunds off supplier credits and DE tax separate", () => {
    const after = applyCustomerRefund({ estimatedProfit: 20, refund: 4 });
    expect(after.supplierReimbursementAssumed).toBe(false);
    expect(after.actualProfit).toBe(16);
    expect(split({ netProfit: 40, taxEstimate: 8, country: "ES" }).emergencyReserve).toBe(10);
    expect(split({ netProfit: 40, taxEstimate: 8, country: "DE" }).emergencyReserve).toBe(0);
    const q = calculate({
      actorId: "pricing_ai",
      supplierCost: 100,
      shipping: 8,
      marketplaceCommission: 12,
      vat: 19,
      returnReserve: 2,
      paymentFees: 1.5,
      category: "automotive",
    });
    expect(q.net).toBeGreaterThanOrEqual(MIN_NET);
  });
});

describe("customer CEARS DR whatsapp", () => {
  it("Banu multilingual fixtures do not send WhatsApp", () => {
    expect(handle({ text: "Where is my order?", locale: "en", facts: { orderId: "SYN-1" } }).sent).toBe(false);
    expect(handle({ text: "iade", locale: "tr" }).sent).toBe(false);
    expect(send().sent).toBe(false);
  });

  it("evidence and CEARS remain local", () => {
    const c = createCears();
    const o = c.open({ title: "v4", severity: "P2" });
    expect(c.notify().reachedNetwork).toBe(false);
    const locker = createLocker();
    const ev = locker.ingestOriginal({ bytes: "v4", source: "unit" });
    expect(locker.verify(ev.record.evidence_id).ok).toBe(true);
    expect(ev.record.worm).toBe(false);
  });

  it("backup faults are isolated", () => {
    const f = isolatedBackupFaults();
    expect(f.goodOk).toBe(true);
    expect(f.interruptedOk).toBe(false);
    expect(f.corruptOk).toBe(false);
    expect(f.productionDrVerified).toBe(false);
  });
});
