/**
 * Text council meeting. Not a live voice session.
 */
function runTextMeeting({ chair = "pusat", members = ["sinan_bey", "esat_bey", "dogu_bey"] } = {}) {
  const turns = [];
  turns.push({ speaker: chair, role: "chair", text: "Toplantı açıldı. Canlı ses yok." });
  if (members.includes("sinan_bey")) {
    turns.push({
      speaker: "sinan_bey",
      role: "software_architect",
      text: "Transformer proto CODE_READY. Üretim transformer NOT_IMPLEMENTED. Resmî ses REFERENCE_REGISTERED, klon yok, TTS yok.",
    });
  }
  if (members.includes("esat_bey")) {
    turns.push({
      speaker: "esat_bey",
      role: "security_monitor",
      text: "Egress DENY. Esat tek savunma değil. Yetkisiz train/generate reddedilmeli.",
    });
  }
  if (members.includes("dogu_bey")) {
    turns.push({
      speaker: "dogu_bey",
      role: "research",
      text: "Held-out reasoning 0/11. Daha fazla sentetik veri genel zekâ değildir.",
    });
  }
  turns.push({ speaker: chair, role: "chair", text: "Kararlar kayda geçti. Sesli toplantı tamamlanmış sayılmaz." });
  return {
    ok: true,
    mode: "text_only",
    liveVoice: false,
    liveVideo: false,
    copiedOfficialVoice: false,
    turns,
    decisions: ["keep_proto_and_full_transformer_split", "voice_blocked_until_reference"],
  };
}

const { ids, getAgent } = require("../core/identityRegistry");
const { speak } = require("../core/sharedSpeech");

function holdStaffMeeting({ chair = "pusat", topic = "kurmay", voice = false } = {}) {
  if (chair !== "pusat") return { ok: false, code: "CHAIR_MUST_BE_PUSAT", liveVoice: false, liveStt: false, liveTts: false };
  const members = ids();
  const turns = [{ speaker: "pusat", role: "chair", text: `Toplantı açıldı. Konu: ${topic}. Canlı ses yok.`, liveVoice: false }];
  for (const id of members) {
    if (id === "pusat") continue;
    const agent = getAgent(id);
    const said = speak({ agentId: id, text: agent.specialization });
    turns.push({
      speaker: id,
      name: agent.display_name,
      role: agent.role,
      text: `${agent.display_name}: ${agent.specialization}`,
      voiceStatus: said.ok ? said.voiceStatus : said.code,
      avatarStatus: agent.avatar_profile.status,
      officialVoiceUsed: false,
      audioProduced: false,
    });
  }
  const media = [];
  if (voice) {
    const { synthesizeStaff, transcribeStaff, alignToAudio } = require("../../voice/staffMedia");
    for (const turn of turns) {
      if (!turn.speaker || turn.role === "chair") continue;
      const spoken = synthesizeStaff({ agentId: turn.speaker, text: "rapor", lang: "tr" });
      if (!spoken.ok) continue;
      const heard = transcribeStaff({ audio: spoken.wav, lang: "tr" });
      const mouth = alignToAudio(spoken.phonemes, spoken.wav);
      turn.audioProduced = true;
      turn.voiceId = spoken.voiceId;
      media.push({
        speaker: turn.speaker,
        voiceId: spoken.voiceId,
        bytes: spoken.bytes,
        frames: spoken.frames.length,
        transcript: heard.transcript,
        lipSync: mouth.lipSync === true,
        mesh: mouth.mesh,
        officialVoiceUsed: false,
      });
    }
  }
  turns.push({ speaker: "pusat", role: "chair", text: "Tutanak kapandı. Canlı STT, TTS ve telefon yok.", liveVoice: false });
  return {
    ok: members.length === 17,
    chair: "pusat",
    members: members.length,
    turns,
    minutes: turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n"),
    media,
    liveVoice: false,
    liveStt: false,
    liveTts: false,
    realtime: "NOT_CONFIGURED",
    salesEnabled: false,
  };
}

module.exports = { runTextMeeting, holdStaffMeeting };
