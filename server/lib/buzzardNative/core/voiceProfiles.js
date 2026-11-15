/**
 * Local voice-profile report for the official 17.
 * Reads registry state and does not place a call or write a recording.
 */
const { roster } = require("../../pusat/council");
const { SEED_IDS, getAgentExact } = require("./identityRegistry");
const { providerAdapters } = require("../../voice/councilVoice");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");

const SINAN_FILE = "public/council/sinan-bey-official-voice-v1.m4a";

function reportVoiceProfiles() {
  const profiles = [];
  const seen = new Set();
  for (const member of roster("official")) {
    if (!member || seen.has(member.id)) continue;
    seen.add(member.id);
    const agent = getAgentExact(member.id);
    const profile = agent && agent.voice_profile ? agent.voice_profile : null;
    const official = Boolean(profile && profile.officialSinan === true && member.id === "sinan_bey");
    const status = profile && profile.status ? profile.status : "UNKNOWN";
    profiles.push({
      id: member.id,
      voiceProfileId: profile ? profile.voice_profile_id : null,
      status: official ? status : status === "REFERENCE_REGISTERED" ? "NOT_CONFIGURED" : status,
      officialSinan: official,
      referenceFile: official ? profile.file || SINAN_FILE : null,
      cloneAuthorized: false,
      ready: false,
      live: false,
      ttsReady: false,
      serviceConnected: false,
    });
  }
  const ids = profiles.map((profile) => profile.id);
  const sinan = profiles.find((profile) => profile.id === "sinan_bey");
  const file = sinan && sinan.officialSinan ? verifyOfficialFile() : { ok: false, unchanged: false };
  const adapters = providerAdapters();
  return {
    ok: false,
    rosterComplete: ids.length === SEED_IDS.length && SEED_IDS.every((id) => ids.includes(id)),
    count: ids.length,
    ids,
    profiles,
    sinanPreserved: Boolean(sinan && sinan.status === "REFERENCE_REGISTERED" && sinan.referenceFile === SINAN_FILE && file.unchanged === true),
    recordingRewritten: false,
    adapters,
    callPlaced: false,
    serviceConnected: adapters.some((row) => row.serviceConnected),
    productionReady: false,
    salesEnabled: false,
    liveNetwork: false,
  };
}

module.exports = { reportVoiceProfiles, SINAN_FILE };
