const flags = require("../flags");
const avatar = require("./avatarProvider");
const stt = require("../providers/stt");
const tts = require("../providers/tts");
const telephony = require("../providers/telephony");
const webrtc = require("../providers/webrtc");
const { liveCriteria } = require("../productionValidator");
const { discoverCredentials } = require("./credentialDiscovery");
const { liveCriteriaSnapshot, overallLiveCriteria } = require("./liveCriteriaSnapshot");

function evaluateActivation() {
  const f = flags.getFlags();
  const creds = discoverCredentials();
  const live = {
    avatar: liveCriteria({
      configured: avatar.configured(),
      wired: avatar.wired(),
      reachable: avatar.lastLiveSuccess(),
      authenticated: avatar.lastLiveSuccess(),
      liveOk: avatar.lastLiveSuccess(),
      flagOn: f.AVATAR_ENABLED && f.REALTIME_AVATAR_ENABLED,
    }),
    stt: stt.lastLiveSuccess() && f.VOICE_ENABLED,
    tts: tts.lastLiveSuccess() && f.VOICE_ENABLED,
    phone: telephony.lastLiveSuccess() && f.PHONE_ENABLED,
    webrtcMedia: false,
  };
  const snapshot = liveCriteriaSnapshot();
  return {
    credentials: creds.keys,
    live,
    criteria: snapshot,
    overall: overallLiveCriteria(snapshot),
    activateFlags: false,
    reason: live.avatar && live.stt && live.tts ? "LIVE_VALIDATED" : "BLOCKED_BY_PROVIDER_CONFIGURATION",
    note: "Flags are never auto-enabled without a successful live provider session.",
  };
}

function iceStatus() {
  const ice = webrtc.iceConfig();
  if (ice.turnConfigured && ice.stunConfigured) return "PASS";
  if (ice.stunConfigured || ice.turnConfigured) return "PARTIAL";
  return "BLOCKED";
}

module.exports = { evaluateActivation, iceStatus };
