const vad = require("../providers/vad");
const stt = require("../providers/stt");
const webrtc = require("../providers/webrtc");
const { handleTurn, createSession } = require("./runtime");
const avatar = require("./avatarProvider");
const telemetry = require("./telemetry");
const { evaluateActivation } = require("./activation");

function liveClaims() {
  const activation = evaluateActivation();
  return {
    REAL_AVATAR_ACTIVE: Boolean(activation.live.avatar),
    REAL_VIDEO_ACTIVE: false,
    REAL_LIP_SYNC_ACTIVE: Boolean(activation.live.avatar && avatar.lastLiveSuccess()),
    REAL_STT_ACTIVE: Boolean(activation.live.stt),
    REAL_TTS_ACTIVE: Boolean(activation.live.tts),
    REAL_PHONE_ACTIVE: Boolean(activation.live.phone),
    WEBRTC_MEDIA_ACTIVE: false,
  };
}

async function runRealtimeTurn(sessionId, input = {}) {
  const started = Date.now();
  telemetry.start(sessionId);
  const voiceActivity = vad.analyze({
    energy: input.energy,
    speaking: input.speaking,
    silenceMs: input.silenceMs,
  });
  const interrupt = Boolean(input.interrupt || (voiceActivity.interruption && input.bargeIn));
  const sttStarted = Date.now();
  let heard = null;
  if (!input.message && input.audio) {
    heard = await stt.transcribe({
      audio: input.audio,
      language: input.language,
      testTranscript: input.testTranscript,
    });
    telemetry.mark(sessionId, "sttMs", Date.now() - sttStarted);
    if (!heard.ok && !input.message) {
      return {
        ok: false,
        code: heard.code,
        vad: voiceActivity,
        claims: liveClaims(),
        webrtc: webrtc.connectionState(input.webrtcSessionId || sessionId),
        telemetry: telemetry.finish(sessionId, { errors: [heard.code] }),
      };
    }
  }
  const turn = await handleTurn(sessionId, {
    ...input,
    message: input.message || heard?.transcript,
    interrupt,
    channel: input.channel || (input.audio ? "VOICE" : "TEXT"),
  });
  telemetry.mark(sessionId, "orchestratorMs", Date.now() - started);
  return {
    ...turn,
    vad: voiceActivity,
    bargeIn: interrupt,
    claims: liveClaims(),
    webrtc: webrtc.connectionState(input.webrtcSessionId || sessionId),
    telemetry: telemetry.finish(sessionId, {
      provider: turn.session?.provider?.provider || null,
    }),
  };
}

module.exports = {
  runRealtimeTurn,
  liveClaims,
  createSession,
};
