const viseme = require("./visemeEngine");

function visemesFromText(text) {
  return viseme.buildTimeline({ text });
}

function syncWithAudio({ text, audioPresent, ttsLive, durationMs, audioBytes, sampleRate, nativeLipSync, interrupted }) {
  if (interrupted) return viseme.silence();
  const timeline = viseme.buildTimeline({
    text,
    durationMs: audioPresent ? durationMs : null,
    audioBytes,
    sampleRate,
    nativeLipSync,
  });
  return {
    ...timeline,
    audioPresent: Boolean(audioPresent),
    ttsLive: Boolean(ttsLive),
    claimedLiveHuman: false,
    jaw: timeline.audioLocked ? "synced" : "idle",
  };
}

module.exports = { visemesFromText, syncWithAudio, VISEMES: viseme.STATES };
