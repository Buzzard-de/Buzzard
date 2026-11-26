import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { openDurableFile } = require("../lib/pusat/durable.js");
const { installLocalLanguageModel, measureReasoning, MODEL, languageDir } = require("../lib/buzzardNative/thinking/localLanguageModel.js");
const { inferLanguage } = require("../lib/buzzardNative/thinking/localLanguageModel.js");
const { check } = require("../lib/buzzardNative/core/permissionEngine.js");
const { planRecovery } = require("../lib/security/esatBey.js");
const aslan = require("../lib/buzzardNative/core/aslanBey.js");
const { createSttEngine, createTtsEngine, createPhoneEngine } = require("../lib/voice/buzzardVoice.js");
const { createRoom, postSignal, sendMedia, dropRoom, reconnectRoom } = require("../lib/voice/signaling.js");

function orchDb() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-council-")), "orch.sqlite");
}

describe("council system", () => {
  it("keeps the verified language model in the persistent directory", () => {
    const installed = installLocalLanguageModel();
    expect(installed).toMatchObject({
      ok: true,
      downloaded: false,
      paid: false,
      license: "Apache-2.0",
      sha256: MODEL.sha256,
      model: "Qwen2.5-1.5B-Instruct",
    });
    expect(installed.file).toBe(path.join(languageDir(), MODEL.fileName));
    expect(installed.bytes).toBe(MODEL.bytes);
    expect(installed.runner).toMatch(/llama-cli$/);
  });

  it("measures Turkish, German, and English reasoning without hiding failed checks", () => {
    const measured = measureReasoning();
    expect(measured.paid).toBe(false);
    expect(measured.generalPurpose).toBe(false);
    expect(measured.rows).toHaveLength(21);
    expect(measured.passed + measured.failed).toBe(21);
    for (const row of measured.rows) {
      expect(row.actionsExecuted).toBe(false);
      expect(row.passed).toBe(row.code === "LOCAL_MODEL");
      if (!row.passed) expect(row.code).not.toBe("LOCAL_MODEL");
    }
    const rejected = inferLanguage({
      prompt: "What is the capital of France?",
      accept: () => false,
    });
    expect(rejected.ok).toBe(false);
    expect(rejected.code).not.toBe("LOCAL_MODEL");
    expect(rejected.actionsExecuted).toBe(false);
  }, 180000);

  it("runs Süleyman's task, the council meeting, and the safety gates", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const dbPath = orchDb();
    const orch = createOrchestrator({ dbPath });
    expect(orch.handleRequest({ text: "fiyat hesapla", requester: "banu_hanim" }).code).toBe("PERMISSION_DENIED");
    expect(orch.handleRequest({ text: "satışı aç" })).toMatchObject({ code: "SALES_LOCKED", purchased: false, salesEnabled: false });
    expect(check("pricing_ai", "STOCK_BUY").code).toBe("HUMAN_GATE_REQUIRED");
    expect(check("banu_hanim", "ASSIGN_TASK").code).toBe("PERMISSION_DENIED");
    expect(check("stock_ai", "speech").ok).toBe(false);
    const price = orch.handleRequest({ text: "fiyat hesapla", requester: "suleyman_bey", idempotencyKey: "council-price" });
    expect(price.specialists[0]).toMatchObject({
      agentId: "pricing_ai",
      execution: "RULE_BASED",
      llmCompleted: false,
      lifecycle: "COMPLETED",
    });
    const session = orch.holdCouncil({ topic: "günlük kurmay" });
    expect(session.ok).toBe(true);
    expect(session.members).toBe(17);
    expect(session.to).toBe("suleyman_bey");
    expect(session.stockSpeech).toBe(false);
    expect(session.naturalSpeech).toBe(false);
    expect(session.generalStt).toBe(false);
    expect(session.digitalHuman).toBe(false);
    expect(session.mesh).toBe("NOT_CONFIGURED");
    expect(session.carrier).toBe(false);
    expect(session.placedOnCarrier).toBe(false);
    expect(session.salesEnabled).toBe(false);
    expect(session.model.actionsExecuted).toBe(false);
    expect(session.model.generalPurpose).toBe(false);
    if (session.model.code === "LOCAL_MODEL") {
      const start = session.model.answer.indexOf("{");
      const end = session.model.answer.lastIndexOf("}");
      expect(JSON.parse(session.model.answer.slice(start, end + 1))).toMatchObject({ chair: "pusat", actionsExecuted: false });
    } else {
      expect(session.model.code).not.toBe("LOCAL_MODEL");
      expect(session.model.answer).toBeNull();
    }
    const opinions = session.minutes.events.filter((row) => row.kind === "opinion");
    expect(opinions).toHaveLength(17);
    expect(opinions.find((row) => row.speaker_id === "stock_ai").payload_json).toMatch(/"speech":false/);
    orch.close();

    const reopened = createOrchestrator({ dbPath });
    expect(reopened.queue.get(price.specialists[0].taskId).state).toBe("COMPLETED");
    expect(reopened.dailyReport().to).toBe("suleyman_bey");
    reopened.close();
    const meetings = openDurableFile(`${dbPath}.meetings`);
    const stored = meetings.store.getMeeting(session.meetingId);
    expect(stored.status).toBe("CLOSED");
    expect(stored.events.filter((row) => row.kind === "opinion")).toHaveLength(17);
    expect(stored.events.find((row) => row.speakerId === "stock_ai").payload.speech).toBe(false);
    expect(stored.events.find((row) => row.speakerId === "stock_ai").payload.digitalHuman).toBe(false);
    meetings.db.close();

    const defense = planRecovery({ id: "council-recovery" });
    expect(defense.applied).toBe(false);
    expect(defense.productionChange).toBe(false);
    const exam = aslan.examine({ artifacts: [{ name: "sample", bytes: Buffer.from("council-sample") }] });
    expect(exam.executed).not.toBe(true);

    const heard = createSttEngine();
    expect(heard.generalSpeech).toBe(false);
    const spoken = createTtsEngine().speak({ agentId: "pusat", text: "rapor", lang: "tr" });
    expect(spoken.pose.digitalHuman).toBe(false);
    expect(spoken.pose.scannedBody).toBe(false);
    const call = createPhoneEngine().place({ extension: "lab", text: "rapor", lang: "tr" });
    expect(call.placedOnCarrier).toBe(false);
    expect(call.network).toBe(false);

    const room = createRoom({ participants: ["pusat", "zeynep_hanim"] });
    postSignal({ roomId: room.room.id, kind: "offer", fromId: "pusat", payload: { sdp: "offer" } });
    postSignal({ roomId: room.room.id, kind: "answer", fromId: "zeynep_hanim", payload: { sdp: "answer" } });
    const media = sendMedia({ roomId: room.room.id, fromId: "pusat", toId: "zeynep_hanim", payload: Buffer.from("pcm") });
    expect(media).toMatchObject({ ok: true, transported: "IN_PROCESS", network: false, carrier: false, iceConnected: false, dtls: false, peerConnection: false });
    expect(dropRoom(room.room.id).state).toBe("dropped");
    expect(sendMedia({ roomId: room.room.id, fromId: "pusat", toId: "zeynep_hanim", payload: Buffer.from("pcm") }).code).toBe("MEDIA_DROPPED");
    expect(reconnectRoom(room.room.id)).toMatchObject({ state: "open", iceConnected: false, peerConnection: false });
  }, 60000);
});
