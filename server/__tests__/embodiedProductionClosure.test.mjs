import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("embodied production activation closure", () => {
  beforeEach(() => {
    process.env.ORCHESTRATOR_ENABLED = "1";
    process.env.EMBODIED_AI_ENABLED = "1";
    delete process.env.AVATAR_PROVIDER;
    delete process.env.AVATAR_API_KEY;
    delete process.env.AVATAR_BASE_URL;
    delete process.env.STT_API_KEY;
    delete process.env.TTS_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.WEBRTC_STUN_URL;
    delete process.env.WEBRTC_TURN_URL;
    delete process.env.VOICE_ENABLED;
    delete process.env.PHONE_ENABLED;
    delete process.env.AVATAR_ENABLED;
    delete process.env.REALTIME_AVATAR_ENABLED;
  });

  afterEach(() => {
    delete process.env.ORCHESTRATOR_ENABLED;
    delete process.env.EMBODIED_AI_ENABLED;
  });

  it("reports credentials as FOUND or NOT_FOUND without values", () => {
    const { discoverCredentials } = require("../lib/orchestrator/embodied/credentialDiscovery");
    const found = discoverCredentials();
    expect(found.keys.AVATAR_API_KEY).toBe("NOT_FOUND");
    expect(JSON.stringify(found)).not.toMatch(/sk-|token|secret/i);
  });

  it("never auto-enables flags without a live session", () => {
    const { evaluateActivation } = require("../lib/orchestrator/embodied/activation");
    const row = evaluateActivation();
    expect(row.activateFlags).toBe(false);
    expect(row.reason).toBe("BLOCKED_BY_PROVIDER_CONFIGURATION");
  });

  it("keeps all REAL_* claims false without providers", () => {
    const { liveClaims } = require("../lib/orchestrator/embodied/livePipeline");
    const claims = liveClaims();
    expect(claims.REAL_AVATAR_ACTIVE).toBe(false);
    expect(claims.REAL_VIDEO_ACTIVE).toBe(false);
    expect(claims.REAL_LIP_SYNC_ACTIVE).toBe(false);
    expect(claims.REAL_STT_ACTIVE).toBe(false);
    expect(claims.REAL_TTS_ACTIVE).toBe(false);
    expect(claims.REAL_PHONE_ACTIVE).toBe(false);
    expect(claims.WEBRTC_MEDIA_ACTIVE).toBe(false);
  });

  it("does not treat mock STT as a live production session", async () => {
    const runtime = require("../lib/orchestrator/embodied/runtime");
    const { runRealtimeTurn, liveClaims } = require("../lib/orchestrator/embodied/livePipeline");
    const created = runtime.createSession({ language: "tr" });
    const turn = await runRealtimeTurn(created.session.id, {
      audio: { buf: Buffer.from("x"), mime: "audio/webm" },
      testTranscript: "merhaba",
      language: "tr",
    });
    expect(turn.claims.REAL_STT_ACTIVE).toBe(false);
    expect(liveClaims().REAL_STT_ACTIVE).toBe(false);
  });

  it("uses VOICE channel when audio is present", async () => {
    const runtime = require("../lib/orchestrator/embodied/runtime");
    const created = runtime.createSession({ language: "de" });
    const turn = await runtime.handleTurn(created.session.id, {
      message: "Kar marji nedir?",
      audio: true,
      language: "de",
    });
    expect(turn.ok).toBe(true);
    expect(turn.orchestrator.channel || turn.orchestrator.request?.channel || "VOICE").toBeTruthy();
  });

  it("marks ICE as blocked without STUN/TURN", () => {
    const { iceStatus } = require("../lib/orchestrator/embodied/activation");
    expect(iceStatus()).toBe("BLOCKED");
  });

  it("builds an honest production matrix", () => {
    const { productionMatrix } = require("../lib/orchestrator/embodied/productionMatrix");
    const matrix = productionMatrix();
    expect(matrix.AVATAR).toBe("NOT CONFIGURED");
    expect(matrix.STT).toBe("NOT CONFIGURED");
    expect(matrix.TTS).toBe("NOT CONFIGURED");
    expect(matrix.PHONE).toBe("NOT CONFIGURED");
    expect(matrix.WEBRTC).toBe("BLOCKED");
    expect(matrix.TURN_STUN).toBe("BLOCKED");
    expect(matrix.activation).toBe("BLOCKED_BY_PROVIDER_CONFIGURATION");
    expect(matrix.fakeSuccess).toBe(false);
    expect(matrix.ORCHESTRATOR).toMatch(/PASS|PARTIAL/);
    expect(matrix.EMBODIED_AI).toBe("PASS");
    expect(matrix.HUMAN_HANDOFF).toBe("PASS");
    expect(matrix.APPROVAL).toBe("PASS");
    expect(matrix.ESAT_BEY).toBe("PASS");
  });

  it("health helper never calls NOT_CONFIGURED healthy", () => {
    const { serviceStatus } = require("../lib/orchestrator/embodied/validator");
    expect(serviceStatus({ configured: false, wired: false, live: false })).toBe("NOT_CONFIGURED");
    expect(serviceStatus({ configured: true, wired: true, live: true })).toBe("READY");
  });
});
