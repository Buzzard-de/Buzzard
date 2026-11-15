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
    thinking: "rule_based_structured_inference_not_llm",
    hearing: "vad_and_tone_codec_not_general_stt",
    speech: { voiceId: VOICE_ID, official: true, referenceRegistered: true, ttsReady: false, cloneAuthorized: false, blocked: false },
    vision: "bitmap_ocr_and_blobs_not_understand",
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
    pusat: { id: "pusat", role: "orchestrator", notAThinkingEngine: true, memoryOwner: "pusat", impersonates: [] },
    sinan_bey: sinanIdentity(),
    esat_bey: { id: "esat_bey", role: "security_monitor", memoryOwner: "esat_bey", soleDefense: false, impersonates: [] },
    dogu_bey: { id: "dogu_bey", role: "research", memoryOwner: "dogu_bey", impersonates: [] },
    voiceCopyForbidden: true,
    identityMixForbidden: true,
  };
}

module.exports = { sinanIdentity, identities };
