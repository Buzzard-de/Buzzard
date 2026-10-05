function present(value) {
  return Boolean(String(value || "").trim());
}

function mark(name, value) {
  return { name, status: present(value) ? "FOUND" : "NOT_FOUND" };
}

function discoverCredentials() {
  const rows = [
    mark("AVATAR_PROVIDER", process.env.AVATAR_PROVIDER),
    mark("AVATAR_API_KEY", process.env.AVATAR_API_KEY || process.env.READY_PLAYER_ME_KEY),
    mark("AVATAR_BASE_URL", process.env.AVATAR_BASE_URL),
    mark("VIDEO_PROVIDER", process.env.VIDEO_PROVIDER),
    mark("VIDEO_API_KEY", process.env.VIDEO_API_KEY),
    mark("VIDEO_BASE_URL", process.env.VIDEO_BASE_URL),
    mark("STT_PROVIDER", process.env.STT_PROVIDER),
    mark("STT_API_KEY", process.env.STT_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPGRAM_API_KEY),
    mark("STT_BASE_URL", process.env.STT_BASE_URL),
    mark("TTS_PROVIDER", process.env.TTS_PROVIDER),
    mark("TTS_API_KEY", process.env.TTS_API_KEY || process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY),
    mark("TTS_BASE_URL", process.env.TTS_BASE_URL),
    mark("TELEPHONY_PROVIDER", process.env.TELEPHONY_PROVIDER),
    mark("TELEPHONY_API_KEY", process.env.TELEPHONY_API_KEY || process.env.TELEPHONY_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || process.env.TELNYX_API_KEY),
    mark("TELEPHONY_BASE_URL", process.env.TELEPHONY_BASE_URL),
    mark("TELEPHONY_ACCOUNT_SID", process.env.TELEPHONY_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID),
    mark("WEBRTC_STUN_URL", process.env.WEBRTC_STUN_URL),
    mark("WEBRTC_TURN_URL", process.env.WEBRTC_TURN_URL),
    mark("WEBRTC_TURN_USERNAME", process.env.WEBRTC_TURN_USERNAME),
    mark("WEBRTC_TURN_CREDENTIAL", process.env.WEBRTC_TURN_CREDENTIAL),
  ];
  const map = {};
  for (const row of rows) map[row.name] = row.status;
  return {
    keys: map,
    anyProvider: rows.some((row) => row.status === "FOUND" && /API_KEY|ACCOUNT_SID|TURN_URL|STUN_URL|BASE_URL/.test(row.name)),
  };
}

module.exports = { discoverCredentials, present };
