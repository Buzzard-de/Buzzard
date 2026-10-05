import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("openai realtime + twilio provider stack", () => {
  beforeEach(() => {
    process.env.ORCHESTRATOR_ENABLED = "1";
    process.env.VOICE_ENABLED = "1";
    process.env.VOICE_WEBRTC_ENABLED = "1";
    delete process.env.OPENAI_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TELEPHONY_MEDIA_STREAM_URL;
    require("../lib/orchestrator/providers/openaiRealtime").resetForTests();
    require("../lib/orchestrator/providers/twilioIce").resetForTests();
  });

  afterEach(() => {
    require("../lib/orchestrator/providers/openaiRealtime").resetForTests();
    require("../lib/orchestrator/providers/twilioIce").resetForTests();
    delete process.env.ORCHESTRATOR_ENABLED;
    delete process.env.VOICE_ENABLED;
    delete process.env.VOICE_WEBRTC_ENABLED;
    delete process.env.OPENAI_API_KEY;
  });

  it("does not create a realtime session without OPENAI_API_KEY", async () => {
    const realtime = require("../lib/orchestrator/providers/openaiRealtime");
    const created = await realtime.createEphemeralSession({ language: "tr" });
    expect(created.ok).toBe(false);
    expect(created.code).toBe("OPENAI_REALTIME_NOT_CONFIGURED");
    expect(created.live).toBe(false);
    expect(realtime.lastLiveSuccess()).toBe(false);
  });

  it("never sends the OpenAI-Beta realtime header", async () => {
    process.env.OPENAI_API_KEY = "sk-unit-test-not-real";
    const captured = [];
    const realtime = require("../lib/orchestrator/providers/openaiRealtime");
    await realtime.createEphemeralSession({
      language: "de",
      fetchImpl: async (url, init) => {
        captured.push({ url, init });
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({ value: "ek_ephemeral_unit" }),
        };
      },
    });
    expect(captured[0].url).toContain("/v1/realtime/client_secrets");
    const headers = captured[0].init.headers;
    expect(headers["OpenAI-Beta"]).toBeUndefined();
    expect(headers["openai-beta"]).toBeUndefined();
    expect(JSON.stringify(headers.Authorization || "")).not.toContain("ek_");
  });

  it("does not echo the master API key in an ephemeral payload", async () => {
    process.env.OPENAI_API_KEY = "sk-unit-test-not-real";
    const realtime = require("../lib/orchestrator/providers/openaiRealtime");
    const created = await realtime.createEphemeralSession({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ value: "ek_ephemeral_unit" }),
      }),
    });
    expect(created.ok).toBe(true);
    expect(created.ephemeralKey).toBe("ek_ephemeral_unit");
    expect(JSON.stringify(created)).not.toContain("sk-unit-test-not-real");
    realtime.resetForTests();
    expect(realtime.lastLiveSuccess()).toBe(false);
  });

  it("routes a user transcript through the Pusat orchestrator, not the model", async () => {
    process.env.OPENAI_API_KEY = "sk-unit-test-not-real";
    const realtime = require("../lib/orchestrator/providers/openaiRealtime");
    const created = await realtime.createEphemeralSession({
      language: "tr",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ value: "ek_ephemeral_unit" }),
      }),
    });
    const turn = await realtime.handleUserTranscript(created.session.id, {
      transcript: "Bu urunun stogu var mi?",
      language: "tr",
    });
    expect(turn.orchestrator).toBeTruthy();
    expect(turn.orchestrator.channel === "VOICE" || turn.ok !== undefined).toBe(true);
    realtime.resetForTests();
  });

  it("rejects Twilio ICE minting without account credentials", async () => {
    const ice = require("../lib/orchestrator/providers/twilioIce");
    const minted = await ice.mintIceServers();
    expect(minted.ok).toBe(false);
    expect(minted.code).toBe("TURN_PROVIDER_NOT_CONFIGURED");
    expect(minted.iceServers).toEqual([]);
  });

  it("requires wss media streams for Twilio TwiML", () => {
    const telephony = require("../lib/orchestrator/providers/telephony");
    expect(telephony.mediaStreamTwiml().code).toBe("PHONE_MEDIA_STREAM_NOT_CONFIGURED");
    process.env.TELEPHONY_MEDIA_STREAM_URL = "https://example.com/stream";
    expect(telephony.mediaStreamTwiml().ok).toBe(false);
    process.env.TELEPHONY_MEDIA_STREAM_URL = "wss://example.com/stream";
    const xml = telephony.mediaStreamTwiml({ bidirectional: true });
    expect(xml.ok).toBe(true);
    expect(xml.twiml).toContain("wss://example.com/stream");
    expect(xml.twiml).toContain("<Connect>");
  });

  it("does not mark WebRTC media active from SDP-only stats", () => {
    const webrtc = require("../lib/orchestrator/providers/webrtc");
    const created = webrtc.createSignalSession({ language: "de" });
    webrtc.setOffer(created.session.id, created.token, "offer");
    webrtc.setAnswer(created.session.id, created.token, "answer");
    const stats = webrtc.reportMediaStats(created.session.id, created.token, {
      connectionState: "connected",
      iceConnectionState: "connected",
      bytesReceived: 0,
      packetsReceived: 0,
      trackCount: 1,
    });
    expect(stats.signalingComplete).toBe(true);
    expect(stats.mediaConnected).toBe(false);
    const withMedia = webrtc.reportMediaStats(created.session.id, created.token, {
      connectionState: "connected",
      iceConnectionState: "connected",
      bytesReceived: 2048,
      packetsReceived: 12,
      audioTrack: true,
    });
    expect(withMedia.mediaConnected).toBe(true);
  });
});
