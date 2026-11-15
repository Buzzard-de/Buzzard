const { ids, getAgent } = require("./identityRegistry");
const { speak } = require("./sharedSpeech");
const { executiveSize } = require("./councilConfig");
const { resolveIdentity } = require("./councilAliasMap");

function openMeeting({ present = [], agenda = "status" } = {}) {
  const all = ids();
  const resolvedPresent = present.map((p) => {
    const r = resolveIdentity(p);
    return r.ok && r.nativeId ? r.nativeId : p;
  });
  const known = resolvedPresent.filter((p) => all.includes(p));
  const absent = all.filter((p) => !known.includes(p));
  const attendance = {};
  for (const id of all) attendance[id] = known.includes(id);
  const turns = known.map((id) => ({
    speaker: id,
    role: getAgent(id).role,
    present: true,
    text: `${getAgent(id).display_name} written report for ${agenda}.`,
  }));
  const voice = known.includes("sinan_bey")
    ? speak({ agentId: "sinan_bey", text: "rapor" })
    : { skipped: true };
  return {
    ok: true,
    state: "STARTED",
    liveVoice: false,
    attendance,
    absent,
    fakeAttendance: false,
    turns,
    voiceReport: voice,
    copiedOfficialVoice: false,
    executive: executiveSize(),
    llmCouncil: false,
  };
}

module.exports = { openMeeting };
