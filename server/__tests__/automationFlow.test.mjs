import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator, LIFECYCLE } = require("../lib/pusat/orchestrator.js");
const { ids } = require("../lib/buzzardNative/core/identityRegistry.js");
const { modelGate } = require("../lib/buzzardNative/thinking/modelGate.js");
const { createTransformer, checkpoint } = require("../lib/buzzardNative/thinking/transformer.js");

function orchDb() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-auto-")), "orch.sqlite");
}

describe("Pusat automation", () => {
  it("classifies, runs the specialist, and keeps the task after reopen", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const dbPath = orchDb();
    const orch = createOrchestrator({ dbPath });
    const ran = orch.handleRequest({ text: "yazılım kodunu incele", requester: "suleyman_bey", idempotencyKey: "job-1", voice: true });
    expect(ran.ok).toBe(true);
    expect(ran.from).toBe("pusat");
    expect(ran.to).toBe("suleyman_bey");
    expect(ran.domain).toBe("software");
    expect(ran.specialists).toHaveLength(1);
    expect(ran.specialists[0].agentId).toBe("sinan_bey");
    expect(ran.specialists[0].verification).toBe("INDEPENDENT_OK");
    expect(ran.specialists[0].confidence).toBe("rule_verified");
    expect(ran.specialists[0].lifecycle).toBe("COMPLETED");
    expect(ran.pusatDidSpecialistWork).toBe(false);
    expect(ran.model.code).toBe("MODEL_NOT_CONFIGURED");
    expect(ran.salesEnabled).toBe(false);
    expect(ran.saas).toBe(false);
    expect(ran.spoken[0]).toMatchObject({ taskId: ran.specialists[0].taskId, audio: true, officialVoiceUsed: false, placedOnCarrier: false, network: false });
    expect(ran.memory.store.get({ actorId: "banu_hanim", ownerId: "pusat", type: "shared_knowledge", key: "auto-software" }).code).toBe("MEMORY_ISOLATION_DENIED");
    const again = orch.handleRequest({ text: "yazılım kodunu incele", idempotencyKey: "job-1" });
    expect(again.duplicate).toBe(true);
    expect(again.specialists).toHaveLength(0);
    const stored = orch.queue.get(ran.specialists[0].taskId);
    expect(stored.payload.phases).toEqual(expect.arrayContaining(["RECEIVED", "CLASSIFIED", "QUEUED", "ASSIGNED", "VERIFYING", "COMPLETED"]));
    orch.close();
    const reopened = createOrchestrator({ dbPath });
    expect(reopened.queue.get(stored.id).state).toBe("COMPLETED");
    expect(reopened.dailyReport().completed).toBe(1);
    reopened.close();
  });

  it("runs a pair in parallel, waits on dependencies, retries, and cancels", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    const brand = orch.handleRequest({ text: "marka taslagi" });
    expect(brand.specialists.map((row) => row.agentId).sort()).toEqual(["adrian", "amelia"]);
    expect(new Set(brand.specialists.map((row) => row.taskId)).size).toBe(2);
    expect(brand.specialists.every((row) => row.status === "COMPLETED")).toBe(true);
    const parent = orch.schedule({ title: "security-first", assigneeId: "esat_bey", kind: "SECURITY_STATUS", input: {}, ownerId: "pusat" });
    const child = orch.schedule({
      title: "software-after",
      assigneeId: "sinan_bey",
      kind: "ANALYZE_CODE",
      input: {},
      ownerId: "pusat",
      dependsOn: [parent.task.id],
    });
    expect(orch.lifecycleOf(child.task)).toBe("WAITING_FOR_DEPENDENCY");
    orch.tick({ limit: 1 });
    expect(orch.lifecycleOf(orch.queue.get(parent.task.id))).toBe("COMPLETED");
    expect(orch.lifecycleOf(orch.queue.get(child.task.id))).toBe("QUEUED");
    orch.tick({ limit: 1 });
    expect(orch.lifecycleOf(orch.queue.get(child.task.id))).toBe("COMPLETED");
    const price = orch.routeStaff({ domain: "price", input: { supplierCost: 10 }, maxAttempts: 2 });
    expect(price.reports.every((row) => row.status === "FAILED")).toBe(true);
    expect(orch.dailyReport().failed).toBe(1);
    const held = orch.schedule({ title: "stop", assigneeId: "seo_ai", kind: "SEO_DRAFT", input: { titleFacts: ["Bremsscheibe"], lang: "de" }, ownerId: "pusat" });
    expect(orch.cancel(held.task.id).lifecycle).toBe("CANCELLED");
    expect(orch.tick({ limit: 0 }).executed).toHaveLength(0);
    expect(LIFECYCLE).toContain("WAITING_FOR_HUMAN_APPROVAL");
    expect(ids()).toHaveLength(17);
    expect(ids().includes("aslan_bey")).toBe(false);
    orch.close();
  });

  it("keeps research and defense on Aslan and Esat without a hosted model", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    expect(orch.handleRequest({ text: "satın al stok", requester: "banu_hanim" }).code).toBe("PERMISSION_DENIED");
    expect(orch.handleRequest({ text: "stok satın al" })).toMatchObject({ code: "HUMAN_GATE_REQUIRED", purchased: false });
    expect(orch.handleRequest({ text: "satışı aç" })).toMatchObject({ code: "SALES_LOCKED", salesEnabled: false });
    const research = orch.handleRequest({ text: "kategori araştır" });
    expect(research.specialists[0].agentId).toBe("dogu_bey");
    expect(research.research.report.verification).toBe("UNVERIFIED");
    expect(research.research.followUp.ok).toBe(true);
    expect(research.research.pusatSummary.to).toBe("pusat");
    const defense = orch.handleRequest({
      text: "güvenlik durumu",
      artifact: {
        name: "auth.log",
        system: "lab-web",
        collectedBy: "pusat",
        collectedAt: "2026-11-25T08:20:00Z",
        text: "2026-11-25T08:19:00Z login 203.0.113.10 lab.example",
      },
    });
    expect(defense.specialists[0].agentId).toBe("esat_bey");
    expect(defense.defense.plan.applied).toBe(false);
    expect(defense.defense.plan.productionChange).toBe(false);
    expect(defense.defense.plan.code).toBe("HUMAN_GATE_REQUIRED");
    expect(defense.defense.offense).toBe(false);
    expect(defense.defense.plan.affected).toEqual(["lab-web"]);
    const gated = orch.handleRequest({ text: "markayı yayınla" });
    expect(gated.specialists[0]).toMatchObject({ agentId: "amelia", status: "GATED", lifecycle: "WAITING_FOR_HUMAN_APPROVAL" });
    expect(orch.approvals.pending()).toHaveLength(1);
    orch.close();
  });

  it("loads a local checkpoint and rejects a corrupt one", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "buzzard-model-"));
    const missing = modelGate({ file: path.join(dir, "missing.json") });
    expect(missing).toMatchObject({ code: "MODEL_NOT_CONFIGURED", mayStartAction: false, ruleEngine: "ACTIVE" });
    const bad = path.join(dir, "bad.json");
    writeFileSync(bad, "{}");
    expect(modelGate({ file: bad }).code).toBe("CHECKPOINT_CORRUPT");
    const model = createTransformer({ vocabSize: 4, dModel: 4, nHeads: 2, nPos: 4, dff: 8, seed: 3 });
    const file = path.join(dir, "local.json");
    writeFileSync(file, JSON.stringify(checkpoint(model)));
    const loaded = modelGate({ file });
    expect(loaded).toMatchObject({
      ok: true,
      code: "LOCAL_CHECKPOINT",
      mayStartAction: false,
      generalPurpose: false,
      hostedProvider: null,
      liveVerified: false,
      ruleEngine: "ACTIVE",
    });
  });
});
