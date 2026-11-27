import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { openCouncilFloor } = require("../lib/voice/councilFloor.js");
const { speakNatural } = require("../lib/voice/naturalSpeech.js");
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { internetCallStatus } = require("../lib/voice/rtcMedia.js");
const { phoneStackStatus } = require("../lib/voice/sipLocal.js");

describe("council voice chain", () => {
  it("sends a heard request through Pusat and speaks only the routed member", () => {
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-chain-")), "orch.sqlite");
    const floor = openCouncilFloor({ topic: "kurmay" });
    expect(floor.join("suleyman_bey").joined).toBe(true);
    expect(floor.converse({ agentId: "esat_bey", text: "güvenlik durumu", dbPath: path.join(path.dirname(dbPath), "buzzard.db") }).code).toBe("PRODUCTION_DB_LOCKED");

    const voice = floor.converse({ agentId: "esat_bey", text: "güvenlik durumu", dbPath });
    expect(voice).toMatchObject({
      ok: true,
      code: "VOICE_CHAIN",
      agentId: "esat_bey",
      audio: true,
      ownVoice: false,
      sharedVoice: true,
      personalVoice: "BLOCKED_ASSET",
      modelFile: "tr_TR-antalia-medium.onnx",
      lipSync: true,
      meetingUntouched: true,
      channel: "private",
      digitalHuman: false,
      photoreal: false,
      realCharacter: false,
      purchased: false,
      salesEnabled: false,
      carrier: false,
      internet: false,
      phoneLine: "BLOCKED_EXTERNAL",
    });
    expect(voice.peakJaw).toBeGreaterThan(0);
    expect(voice.bytes).toBeGreaterThan(44);
    expect(voice.sentence).toContain("esat_bey");
    expect(floor.snapshot().transcript).toHaveLength(0);
    expect(floor.snapshot().seats.find((seat) => seat.agentId === "esat_bey").pose).toBe("listening");

    const reopened = createOrchestrator({ dbPath });
    const stored = reopened.queue.get(voice.taskId);
    reopened.close();
    expect(stored.assigneeId).toBe("esat_bey");
    expect(["COMPLETED", "GATED"]).toContain(stored.state);

    const elsewhere = floor.converse({ agentId: "esat_bey", text: "fiyat kontrol", dbPath });
    expect(elsewhere).toMatchObject({ ok: false, code: "ROUTED_ELSEWHERE", audio: false, meetingUntouched: true });
    expect(elsewhere.workers).toContain("pricing_ai");
    expect(elsewhere.workers).not.toContain("esat_bey");

    const written = floor.converse({ agentId: "pricing_ai", text: "fiyat kontrol", dbPath });
    expect(written).toMatchObject({ ok: true, code: "WRITTEN_ONLY", audio: false, speechGranted: false, agentId: "pricing_ai" });
    expect(written.sentence.length).toBeGreaterThan(0);

    const gated = floor.converse({ agentId: "pusat", text: "stok satın al", dbPath });
    expect(gated).toMatchObject({ ok: false, code: "HUMAN_GATE_REQUIRED", audio: false, purchased: false, salesEnabled: false });

    const empty = floor.converse({ agentId: "esat_bey", wav: Buffer.alloc(32), dbPath });
    expect(empty).toMatchObject({ ok: false, code: "AUDIO_EMPTY", audio: false });

    const said = speakNatural({ text: "güvenlik durumu", lang: "tr", agentId: "esat_bey", turkish: true });
    expect(said.ok).toBe(true);
    const heard = floor.converse({ agentId: "esat_bey", wav: said.wav, dbPath });
    expect(heard.heard.replaced).toBe(false);
    expect(heard.heard.paid).toBe(false);
    expect(heard.meetingUntouched).toBe(true);
    expect(floor.snapshot().transcript).toHaveLength(0);
    if (/güvenlik/i.test(String(heard.heard.transcript || ""))) {
      expect(heard).toMatchObject({ ok: true, code: "VOICE_CHAIN", agentId: "esat_bey", audio: true, ownVoice: false });
      expect(heard.peakJaw).toBeGreaterThan(0);
    } else {
      expect(heard.ok).toBe(false);
      expect(heard.audio).toBe(false);
    }
    expect(heard.heard.transcript || heard.code).toBeTruthy();

    const line = internetCallStatus();
    expect(line).toMatchObject({ status: "BLOCKED_EXTERNAL", internet: false, verified: false, carrier: false });
    const phone = phoneStackStatus();
    expect(phone.phoneLine).toBe("BLOCKED_EXTERNAL");
    expect(phone.freeswitchInstalled).toBe(false);
    expect(phone.operatorAccount).toBe(false);
  }, 120000);
});
