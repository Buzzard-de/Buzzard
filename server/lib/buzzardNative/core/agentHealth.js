/**
 * Local health report for the official 17. CODE_READY is not reachability.
 * No network probe and no commercial action.
 */
const { roster } = require("../../pusat/council");
const { SEED_IDS, getAgentExact } = require("./identityRegistry");

const LEGACY_IDS = Object.freeze([
  "nesrin_hanim",
  "finance_ai",
  "phone_ai",
  "customs_ai",
  "textile_ai",
  "customer_ai",
  "price_ai",
]);

function channel(value) {
  if (value === "NOT_CONFIGURED" || value === "UNKNOWN" || value === "ERROR") return value;
  if (value == null || value === "") return "UNKNOWN";
  return "NOT_CONFIGURED";
}

function reportAgentHealth({ faults = {} } = {}) {
  const seen = new Set();
  const agents = [];
  for (const member of roster("official")) {
    if (!member || seen.has(member.id)) continue;
    seen.add(member.id);
    const agent = getAgentExact(member.id);
    const identityPresent = Boolean(agent && agent.agent_id === member.id && SEED_IDS.includes(member.id));
    const fault = Object.prototype.hasOwnProperty.call(faults, member.id) ? faults[member.id] : null;
    const codeStatus = identityPresent && agent.status ? agent.status : "UNKNOWN";
    const voice = identityPresent ? channel(agent.voice_profile && agent.voice_profile.status) : "UNKNOWN";
    const stt = identityPresent ? "NOT_CONFIGURED" : "UNKNOWN";
    const tts = identityPresent ? channel(agent.voice_profile && agent.voice_profile.status) : "UNKNOWN";
    const phone = identityPresent ? "NOT_CONFIGURED" : "UNKNOWN";
    const liveNetwork = "NOT_CONFIGURED";
    const missing = !identityPresent || codeStatus === "UNKNOWN" || voice === "UNKNOWN";
    agents.push({
      id: member.id,
      identityPresent,
      codeStatus,
      reachable: false,
      liveAccessible: false,
      codeReadyIsLive: false,
      voice,
      stt,
      tts,
      phone,
      liveNetwork,
      fault: fault == null ? null : { code: fault.code || "AGENT_FAULT", isolated: true },
      status: fault != null ? "ERROR" : missing ? (identityPresent ? "NOT_CONFIGURED" : "UNKNOWN") : "NOT_CONFIGURED",
      ok: false,
      healthy: false,
    });
  }
  const ids = agents.map((agent) => agent.id);
  const uniqueCount = new Set(ids).size;
  const rosterComplete =
    ids.length === SEED_IDS.length &&
    uniqueCount === SEED_IDS.length &&
    SEED_IDS.every((id) => ids.includes(id)) &&
    ids.every((id) => !LEGACY_IDS.includes(id));
  return {
    ok: false,
    rosterComplete,
    count: ids.length,
    uniqueCount,
    ids,
    chairId: ids.includes("pusat") ? "pusat" : "UNKNOWN",
    productionReady: false,
    salesEnabled: false,
    liveNetwork: false,
    codeReadyMeansReachable: false,
    reachableCount: agents.filter((agent) => agent.reachable).length,
    agents,
    failedIds: agents.filter((agent) => agent.fault).map((agent) => agent.id),
    isolated: true,
  };
}

module.exports = { reportAgentHealth };
