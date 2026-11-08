const fs = require("fs");
const crypto = require("crypto");
const { VOICE_ID } = require("../speech/voiceIdentity");

function shaFile(rel) {
  const p = require("path").join(process.cwd(), rel);
  if (!fs.existsSync(p)) return { exists: false, path: rel };
  const buf = fs.readFileSync(p);
  return { exists: true, path: rel, bytes: buf.length, sha256: crypto.createHash("sha256").update(buf).digest("hex") };
}

function sinanIdentity() {
  const avatar = shaFile("public/council/sinan-bey.png");
  return {
    id: "sinan_bey",
    title: "Baş Yazılım Mimarı",
    thinking: "tiny_causal_transformer_proto",
    hearing: "vad_only",
    speech: { voiceId: VOICE_ID, official: true, referenceRegistered: true, ttsReady: false, blocked: false },
    vision: "sniff_only",
    memoryOwner: "sinan_bey",
    digitalBody: { avatar: "/council/sinan-bey.png", is3d: false, ...avatar },
    motion: { lipSync: false },
    realtime: { liveMedia: false },
    cannotSelfElevate: true,
    cannotPush: true,
    cannotBypassEsat: true,
    unknownStaysUnknown: true,
  };
}

function identities() {
  return {
    pusat: { role: "orchestrator", notAThinkingEngine: true },
    sinan_bey: sinanIdentity(),
    esat_bey: { role: "security_monitor", soleDefense: false },
    dogu_bey: { role: "research" },
    voiceCopyForbidden: true,
  };
}

module.exports = { sinanIdentity, identities };
