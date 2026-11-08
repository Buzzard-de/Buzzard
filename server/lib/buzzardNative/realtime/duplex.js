const crypto = require("crypto");
const { createSessionHub } = require("./nativeSession");
const { wavTone } = require("../speech/wavTone");

function encrypt(buf, key, iv) {
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  return { enc, tag: c.getAuthTag() };
}

function decrypt(enc, key, iv, tag) {
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]);
}

function duplexOnce({ dropRate = 0 } = {}) {
  const hub = createSessionHub();
  const a = hub.open({ actorId: "sinan_bey", participants: ["pusat"] });
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const wav = wavTone({ hz: 170.8, ms: 40 });
  const t0 = process.hrtime.bigint();
  const { enc, tag } = encrypt(wav, key, iv);
  const dropped = dropRate > 0 && Math.random() < dropRate;
  if (!dropped) hub.send({ sessionId: a.sessionId, actorId: "sinan_bey", bytes: enc });
  const back = dropped ? null : decrypt(enc, key, iv, tag);
  const latencyMs = Number(process.hrtime.bigint() - t0) / 1e6;
  hub.close({ sessionId: a.sessionId, actorId: "sinan_bey" });
  return {
    ok: true,
    liveMedia: false,
    webrtcMedia: false,
    liveCommunicationPass: false,
    encrypted: true,
    roundTripMs: latencyMs,
    dropped,
    payloadMatch: Boolean(back && back.equals(wav)),
    video: false,
    status: "BLOCKED",
    reason: "in_process_loopback_not_network_webrtc",
  };
}

function measureLoss(n = 20, dropRate = 0.1) {
  let drop = 0;
  const lat = [];
  for (let i = 0; i < n; i += 1) {
    const r = duplexOnce({ dropRate });
    if (r.dropped) drop += 1;
    else lat.push(r.roundTripMs);
  }
  return {
    n,
    dropRateRequested: dropRate,
    dropped: drop,
    meanLatencyMs: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null,
    liveMedia: false,
  };
}

module.exports = { duplexOnce, measureLoss };
