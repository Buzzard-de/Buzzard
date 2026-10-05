const flags = require("../flags");
const avatar = require("./avatarProvider");
const video = require("./videoSession");
const stt = require("../providers/stt");
const tts = require("../providers/tts");
const telephony = require("../providers/telephony");
const webrtc = require("../providers/webrtc");
const openaiRealtime = require("../providers/openaiRealtime");
const twilioIce = require("../providers/twilioIce");

function yn(value) {
  return value ? "YES" : "NO";
}

function liveTest({ configured, liveOk }) {
  if (!configured) return "BLOCKED";
  return liveOk ? "PASS" : "FAIL";
}

function row({ configured, wired, reachable, authenticated, liveOk }) {
  return {
    CONFIGURED: yn(configured),
    WIRED: yn(wired),
    REACHABLE: yn(reachable),
    AUTHENTICATED: yn(authenticated),
    LIVE_TEST: liveTest({ configured, liveOk }),
  };
}

function liveCriteriaSnapshot() {
  const f = flags.getFlags();
  const ice = webrtc.iceConfig();
  const sttI = stt.inspect();
  const ttsI = tts.inspect();
  const phoneI = telephony.inspect();
  return {
    avatar: row({
      configured: avatar.configured(),
      wired: avatar.wired(),
      reachable: avatar.lastLiveSuccess(),
      authenticated: avatar.lastLiveSuccess(),
      liveOk: avatar.lastLiveSuccess() && f.AVATAR_ENABLED && f.REALTIME_AVATAR_ENABLED,
    }),
    video: row({
      configured: video.videoConfigured(),
      wired: video.videoConfigured(),
      reachable: false,
      authenticated: false,
      liveOk: false,
    }),
    stt: row({
      configured: sttI.configured,
      wired: sttI.wired,
      reachable: stt.lastLiveSuccess(),
      authenticated: stt.lastLiveSuccess(),
      liveOk: stt.lastLiveSuccess() && f.VOICE_ENABLED,
    }),
    tts: row({
      configured: ttsI.configured,
      wired: ttsI.wired,
      reachable: tts.lastLiveSuccess(),
      authenticated: tts.lastLiveSuccess(),
      liveOk: tts.lastLiveSuccess() && f.VOICE_ENABLED,
    }),
    phone: row({
      configured: phoneI.configured,
      wired: phoneI.wired,
      reachable: telephony.lastLiveSuccess(),
      authenticated: telephony.lastLiveSuccess(),
      liveOk: telephony.lastLiveSuccess() && f.PHONE_ENABLED,
    }),
    openaiRealtime: row({
      configured: openaiRealtime.configured(),
      wired: openaiRealtime.configured(),
      reachable: openaiRealtime.lastLiveSuccess(),
      authenticated: openaiRealtime.lastLiveSuccess(),
      liveOk: openaiRealtime.lastLiveSuccess() && f.VOICE_ENABLED,
    }),
    turn: row({
      configured: twilioIce.configured() || ice.stunConfigured || ice.turnConfigured,
      wired: twilioIce.configured() || (ice.stunConfigured && ice.turnConfigured),
      reachable: twilioIce.lastLiveSuccess(),
      authenticated: twilioIce.lastLiveSuccess() || Boolean(process.env.WEBRTC_TURN_USERNAME && process.env.WEBRTC_TURN_CREDENTIAL),
      liveOk: false,
    }),
  };
}

function overallLiveCriteria(snapshot) {
  const parts = Object.values(snapshot);
  return {
    CONFIGURED: parts.every((row) => row.CONFIGURED === "YES") ? "YES" : "NO",
    WIRED: parts.every((row) => row.WIRED === "YES") ? "YES" : "NO",
    REACHABLE: parts.every((row) => row.REACHABLE === "YES") ? "YES" : "NO",
    AUTHENTICATED: parts.every((row) => row.AUTHENTICATED === "YES") ? "YES" : "NO",
    LIVE_TEST: parts.every((row) => row.LIVE_TEST === "PASS") ? "PASS" : "BLOCKED",
  };
}

module.exports = { liveCriteriaSnapshot, overallLiveCriteria, row };
