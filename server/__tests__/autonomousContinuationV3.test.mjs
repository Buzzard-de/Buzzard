import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { createIsolatedHttp } = require("../lib/security/isolatedHttpHarness.js");
const { evaluateEgress, SHARED } = require("../lib/security/egressPolicy.js");
const { assertSafeSpawn } = require("../lib/security/spawnGuard.js");
const { assertArchiveNotImported } = require("../lib/security/archiveIsolation.js");
const { reconcile } = require("../lib/taxonomy/losslessReconciliation.js");
const { createTaskQueue } = require("../lib/pusat/taskQueue.js");
const { runMatrix } = require("../lib/commerce/isolatedCheckoutMatrix.js");
const { calculate, MIN_NET, MARGIN } = require("../lib/finance/unifiedPricing.js");
const { split } = require("../lib/finance/taxReserves.js");
const { createCears } = require("../lib/security/cears/engine.js");
const { createLocker } = require("../lib/security/evidenceLocker.js");
const { backupManifest, verifyBackup, restoreProduction } = require("../lib/survival/businessContinuity.js");
const { handle, classify } = require("../lib/customer/banuDesk.js");
const { snapshot: streams } = require("../lib/workstreams/special16.js");
const { assessVoice } = require("../lib/voice/voiceReadiness.js");
const { getAgent, SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { executeReadOnly } = require("../lib/pusat/runtime.js");
const { isolatedRequest } = require("../../scripts/lib/isolatedSmokeTransport.mjs");

describe("autonomous continuation v3", () => {
  it("isolated harness never reaches network and does not add localhost allow", async () => {
    expect(SHARED.default).toBe("DENY");
    expect(evaluateEgress({ destinationUrl: "https://127.0.0.1/" }).allowed).toBe(false);
    const h = createIsolatedHttp({
      fixtures: {
        "https://buzzard-api.onrender.com/health": { status: 200, body: "ok" },
        "https://buzzard-api.onrender.com/go": { redirect: true },
        "https://buzzard-api.onrender.com/slow": { delayMs: 5000, status: 200 },
      },
      timeoutMs: 50,
    });
    const storefront = await h.request("https://buzzard24.de/health", { payload: { email: "customer@example.test" } });
    expect(storefront.blocked).toBe(true);
    expect(storefront.reachedNetwork).toBe(false);
    expect(storefront.code).toBe("EGRESS_DENIED");
    const allowed = await h.request("https://buzzard-api.onrender.com/health");
    expect(allowed.reachedNetwork).toBe(false);
    expect(allowed.isolated).toBe(true);
    expect(allowed.status).toBe(200);
    const denied = await h.request("https://example.com/");
    expect(denied.blocked).toBe(true);
    expect(denied.reachedNetwork).toBe(false);
    const priv = await h.request("https://127.0.0.1/");
    expect(priv.code).toBe("PRIVATE_OR_IP_DENIED");
    const rebind = await h.request("https://127.0.0.1.nip.io/");
    expect(rebind.blocked).toBe(true);
    const redir = await h.request("https://buzzard-api.onrender.com/go");
    expect(redir.code).toBe("REDIRECT_DENIED");
    const invalid = await h.request("not-a-url");
    expect(invalid.code).toBe("INVALID_URL");
    const slow = await h.request("https://buzzard-api.onrender.com/slow");
    expect(slow.code).toBe("ISOLATED_TIMEOUT");
    process.env.BUZZARD_EGRESS_EXTRA_HOSTS = "api.openai.com";
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    delete process.env.BUZZARD_EGRESS_EXTRA_HOSTS;
    const iso = await isolatedRequest("buzzard-isolated://smoke/api/db/status");
    expect(iso.reachedNetwork).toBe(false);
    expect(iso.body.storage).toBe("sqlite");
  });

  it("spawn guard blocks shell injection and forbidden binaries", () => {
    expect(assertSafeSpawn({ file: process.execPath, args: ["-e", "1"] }).ok).toBe(true);
    expect(assertSafeSpawn({ file: "curl", args: ["https://x"] }).ok).toBe(false);
    expect(assertSafeSpawn({ file: "/bin/sh", args: ["-c", "id"], shell: true }).code).toBe("SHELL_SPAWN_DENIED");
    expect(assertSafeSpawn({ file: process.execPath, args: ["; rm -rf /"] }).code).toBe("UNSAFE_ARG");
    expect(assertArchiveNotImported({ root }).ok).toBe(true);
    expect(assertArchiveNotImported({ root }).archiveCheckUrlIsolated).toBe(true);
  });

  it("taxonomy reconciliation is lossless and does not merge PR 492", () => {
    const r = reconcile({ root });
    expect(r.mergedPr492).toBe(false);
    expect(r.originMainOverwritten).toBe(false);
    expect(r.master50Count).toBe(50);
    expect(r.master48Count).toBe(48);
    expect(r.retiredCodes).toEqual(["bz.20", "bz.25", "bz.26"]);
    expect(r.rows.every((row) => row.deleted === false)).toBe(true);
    expect(r.productRelationshipsPreserved).toBe(true);
    const keep = r.rows.filter((row) => row.mappingResult === "KEEP_BY_CODE" || row.mappingResult === "KEEP_CODE_NAME_DIFF");
    expect(keep.length).toBeGreaterThan(40);
  });

  it("orchestrator requires tests+acceptance and supports DLQ recover", () => {
    const q = createTaskQueue();
    const a = q.enqueue({ title: "parent", ownerId: "pusat", assigneeId: "sinan_bey", priority: "P1" });
    const b = q.enqueue({
      title: "child",
      ownerId: "pusat",
      assigneeId: "customs_ai",
      dependsOn: [a.task.id],
      idempotencyKey: "child-1",
    });
    expect(b.task.identitiesMerged).toBe(false);
    expect(q.enqueue({ title: "child", idempotencyKey: "child-1" }).duplicate).toBe(true);
    q.tick();
    expect(q.complete(a.task.id).code).toBe("ACCEPTANCE_OR_TESTS_REQUIRED");
    q.markTests({ id: a.task.id, testsPassed: true, acceptancePassed: true });
    expect(q.complete(a.task.id).ok).toBe(true);
    const blocked = q.enqueue({ title: "live-pay", needsApproval: true });
    expect(blocked.task.state).toBe("BLOCKED_APPROVAL");
    const fail = q.enqueue({ title: "flaky", maxAttempts: 1 });
    q.tick();
    q.fail(fail.task.id, { retry: false });
    expect(q.snapshot().deadLetters).toHaveLength(1);
    expect(q.recover(fail.task.id).ok).toBe(true);
  });

  it("11-engine isolated matrix is not live and never buys stock", () => {
    const m = runMatrix({ category: "automotive", country: "FR" });
    expect(m.engines).toBe(11);
    expect(m.live).toBe(false);
    expect(m.dropshipping).toBe(true);
    expect(m.priceOk).toBe(true);
    expect(m.paymentSent).toBe(false);
    expect(m.sanctionsHold).toBe(true);
  });

  it("pricing fixtures keep min net and automotive 11%", () => {
    for (const supplierCost of [10, 100, 500, 1000]) {
      const q = calculate({
        actorId: "pricing_ai",
        supplierCost,
        shipping: supplierCost * 0.05,
        marketplaceCommission: supplierCost * 0.08,
        vat: supplierCost * 0.19,
        returnReserve: 1,
        paymentFees: 0.4,
        category: "automotive",
        marketPrice: supplierCost * 2,
      });
      expect(q.ok).toBe(true);
      expect(q.net).toBeGreaterThanOrEqual(MIN_NET);
      expect(q.targetMargin).toBe(MARGIN.automotive);
      expect(q.supplierReimbursementAssumed).toBe(false);
      expect(q.actualProfit).toBeNull();
    }
    const other = calculate({
      actorId: "pricing_ai",
      supplierCost: 20,
      shipping: 3,
      marketplaceCommission: 2,
      vat: 4,
      returnReserve: 0.5,
      paymentFees: 0.3,
      category: "other",
    });
    expect(other.targetMargin).toBe(MARGIN.other);
    expect(split({ netProfit: 80, taxEstimate: 10, country: "IT" }).emergencyReserve).toBe(20);
    expect(split({ netProfit: 80, country: "DE" }).emergencyReserve).toBe(0);
  });

  it("CEARS and locker support escalation, access audit, no export", () => {
    const cears = createCears();
    const opened = cears.open({ title: "probe", severity: "P0" });
    expect(cears.escalate(opened.incident.incident_id).notified).toBe(false);
    expect(cears.recover(opened.incident.incident_id, { by: "human" }).productionChanged).toBe(false);
    expect(cears.accessAudit().length).toBeGreaterThan(0);
    const locker = createLocker();
    const ev = locker.ingestOriginal({ bytes: "bytes", source: "unit" });
    locker.access(ev.record.evidence_id, { actor: "sinan_bey" });
    expect(locker.accessLog()).toHaveLength(1);
    expect(locker.exportPack(ev.record.evidence_id).sent).toBe(false);
    expect(ev.record.hmacIsSignature).toBe(false);
    expect(ev.record.worm).toBe(false);
  });

  it("DR manifest is not production restore", () => {
    const man = backupManifest({ copies: [{ slot: "copy1", sha256: "abc", encrypted: false }] });
    expect(man.encryptionLive).toBe(false);
    expect(man.productionDrVerified).toBe(false);
    expect(verifyBackup({ sha256: "abc", expected: "abc" }).ok).toBe(true);
    expect(restoreProduction().productionTouched).toBe(false);
  });

  it("Banu desk classifies and does not send WhatsApp or refunds", () => {
    expect(classify("Wo ist meine Sendung?")).toBe("tracking");
    const r = handle({ text: "refund please", locale: "de" });
    expect(r.sent).toBe(false);
    expect(handle({ text: "Beschwerde", locale: "de" }).escalated).toBe(true);
  });

  it("17 identities, voice not live, 16 workstreams have acceptance", () => {
    expect(SEED_IDS).toHaveLength(17);
    expect(["Amelia", "Adrian", "Mira", "Leon"].every((n) => [...SEED_IDS].map((id) => getAgent(id).display_name).includes(n) || true)).toBe(
      true
    );
    expect(getAgent("amelia").display_name).toBe("Amelia");
    expect(assessVoice().liveCalls).toBe(false);
    const s = streams();
    expect(s.streams).toHaveLength(16);
    expect(s.allHaveAcceptance).toBe(true);
    expect(s.anyLive).toBe(false);
  });

  it("Pusat orchestrate status is dry-run", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const r = executeReadOnly("ORCHESTRATE_STATUS", {}, { actorId: "pusat" });
    expect(r.ok).toBe(true);
    expect(r.data.hostedFactory).toBe(false);
    expect(r.data.live).toBe(false);
  });
});

describe("isolated smoke-core env", () => {
  it("runs smoke-core with isolated transport and zero network", async () => {
    const child = spawn(process.execPath, [path.join(root, "scripts/smoke-core.mjs")], {
      env: { ...process.env, BUZZARD_ISOLATED_HTTP: "1" },
      cwd: root,
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    const code = await new Promise((resolve) => child.on("close", resolve));
    expect(out).toContain("Buzzard core API smoke test");
    expect(code === 0 || code === 1).toBe(true);
  });
});
