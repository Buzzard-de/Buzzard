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
      text: "Transformer proto CODE_READY. Üretim transformer NOT_IMPLEMENTED. Resmî ses BLOCKED.",
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

module.exports = { runTextMeeting };
