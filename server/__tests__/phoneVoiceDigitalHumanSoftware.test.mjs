import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const software = require("../lib/software");

describe("phone / voice / digital-human — established fail-closed", () => {
  it("JSON phone assistant never starts, answers, or transfers a call", () => {
    const previous = process.env.TWILIO_AUTH_TOKEN;
    process.env.TWILIO_AUTH_TOKEN = "presence-only";
    try {
      expect(software.phoneAssistant.startCall().reason).toBe("CALL_START_BLOCKED");
      expect(software.phoneAssistant.startCall().callStarted).toBe(false);
      expect(software.phoneAssistant.inboundWebhook().reason).toBe("TWILIO_INBOUND_BLOCKED");
      expect(software.phoneAssistant.digitalHumanSession().avatarOpen).toBe(false);
      expect(software.phoneAssistant.confirmLiveAssistant().liveVerified).toBe(false);
      const escalate = software.phoneAssistant.routeToHumanSupport("tr");
      expect(escalate.callTransferred).toBe(false);
      expect(escalate.callStarted).toBe(false);
      expect(escalate.reason).toBe("ESCALATE_CALL_BLOCKED");
      expect(escalate.live).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.TWILIO_AUTH_TOKEN;
      else process.env.TWILIO_AUTH_TOKEN = previous;
    }
  });

  it("voice stack never opens Twilio, Realtime, WebRTC, SIP, or avatar media", () => {
    const prev = process.env.BUZZARD_VOICE_LIVE_PROBE;
    process.env.BUZZARD_VOICE_LIVE_PROBE = "1";
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "sk-presence-only";
    process.env.DIGITAL_HUMAN_ENDPOINT = process.env.DIGITAL_HUMAN_ENDPOINT || "https://example.invalid";
    try {
      expect(software.voice.startCall().reason).toBe("CALL_START_BLOCKED");
      expect(software.voice.transferCall().transferred).toBe(false);
      expect(software.voice.hangupCall().reason).toBe("HANGUP_BLOCKED");
      expect(software.voice.sipInvite().reason).toBe("SIP_INVITE_BLOCKED");
      expect(software.voice.avatarStream().reason).toBe("AVATAR_STREAM_BLOCKED");
      expect(software.voice.confirmDigitalHuman().liveVerified).toBe(false);
      expect(software.voice.confirmRealtime().reason).toBe("REALTIME_CONFIRM_BLOCKED");
      expect(software.voice.realtimeSession().live).toBe(false);
      expect(software.voice.digitalHumanSession().videoOpen).toBe(false);
      expect(software.voice.health().digitalHumanLive).toBe(false);
      expect(software.voice.health().realtimeLive).toBe(false);
      expect(software.voice.health().avatarOpen).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.BUZZARD_VOICE_LIVE_PROBE;
      else process.env.BUZZARD_VOICE_LIVE_PROBE = prev;
    }
  });

  it("order-status phone path stays text verification only", () => {
    const missing = software.phoneAssistant.verifyOrderAccess({});
    expect(missing.ok).toBe(false);
    expect(missing.errorKey).toBe("ai.phone.missingVerification");
    const status = software.phoneAssistant.getVerifiedOrderStatus({
      orderNumber: "NOPE",
      email: "nobody@example.invalid",
    });
    expect(status.ok).toBe(false);
  });
});
