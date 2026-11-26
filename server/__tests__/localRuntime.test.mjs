import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { modelHealth, prepareLocalModel, consultReasoning } = require("../lib/buzzardNative/thinking/modelGate.js");

function orchDb() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-runtime-")), "orch.sqlite");
}

describe("local runtime", () => {
  it("runs a specialist task through Pusat and leaves general reasoning unanswered", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const dbPath = orchDb();
    const orch = createOrchestrator({ dbPath });
    const ran = orch.handleRequest({ text: "fiyat hesapla", requester: "suleyman_bey", idempotencyKey: "price-1" });
    expect(ran.ok).toBe(true);
    expect(ran.specialists[0]).toMatchObject({
      agentId: "pricing_ai",
      status: "COMPLETED",
      verification: "INDEPENDENT_OK",
      execution: "RULE_BASED",
      llmCompleted: false,
      lifecycle: "COMPLETED",
    });
    expect(ran.model).toMatchObject({ code: "MODEL_NOT_CONFIGURED", filePresent: false });
    expect(ran.pusatDidSpecialistWork).toBe(false);
    const taskId = ran.specialists[0].taskId;
    orch.close();
    const reopened = createOrchestrator({ dbPath });
    expect(reopened.queue.get(taskId).state).toBe("COMPLETED");
    const open = reopened.handleRequest({ text: "genel muhakeme yap" });
    expect(open).toMatchObject({
      ok: false,
      code: "MODEL_NOT_CONFIGURED",
      answer: null,
      llmCompleted: false,
      basis: "RULE_BASED",
      lifecycle: "FAILED",
    });
    expect(reopened.queue.get(open.taskId).payload.error).toBe("MODEL_NOT_CONFIGURED");
    reopened.close();
    const again = createOrchestrator({ dbPath });
    expect(again.lifecycleOf(again.queue.get(open.taskId))).toBe("FAILED");
    again.close();
  });

  it("writes a free local checkpoint and still refuses general reasoning", () => {
    const dest = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-ckpt-")), "local.json");
    expect(modelHealth().filePresent).toBe(false);
    const written = prepareLocalModel({ dest });
    expect(written.paid).toBe(false);
    expect(written.filePresent).toBe(true);
    expect(written.health.probe).toMatchObject({ ok: true, code: "FORWARD_PASS", generalPurpose: false });
    const reasoning = consultReasoning({ file: dest });
    expect(reasoning).toMatchObject({
      ok: false,
      code: "GENERAL_REASONING_UNAVAILABLE",
      answer: null,
      llmCompleted: false,
      generalPurpose: false,
    });
    expect(reasoning.health.filePresent).toBe(true);
    expect(prepareLocalModel({}).code).toBe("MODEL_DEST_REQUIRED");
  });

  it("asks Doğu Bey again when the research result has no source", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    const ran = orch.handleRequest({ text: "kategori araştır", idempotencyKey: "research-1" });
    expect(ran.specialists[0].agentId).toBe("dogu_bey");
    expect(ran.specialists[0].execution).toBe("RULE_BASED");
    expect(ran.research.report.verification).toBe("UNVERIFIED");
    expect(ran.next).toMatchObject({ agentId: "dogu_bey", verified: false, reason: "UNVERIFIED", status: "COMPLETED" });
    expect(ran.next.taskId).not.toBe(ran.specialists[0].taskId);
    expect(orch.queue.get(ran.next.taskId).state).toBe("COMPLETED");
    orch.close();
  });
});
