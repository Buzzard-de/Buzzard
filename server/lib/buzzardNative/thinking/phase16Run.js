const { lab32110 } = require("../memory/localCopies");
const { createCharacterStore } = require("../memory/characterStore");
const { createSupervisorRuntime, design } = require("../platform/alwaysOn");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");
const { probeHardware } = require("./hardwareProbe");

function runPhase16({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const mem = createCharacterStore();
  mem.put({ actorId: "sinan_bey", ownerId: "sinan_bey", section: "identity", key: "role", value: "architect" });
  const denied = mem.get({ actorId: "esat_bey", ownerId: "sinan_bey", section: "identity", key: "role" });
  mem.backupLocal();
  const copies = lab32110();
  const sup = createSupervisorRuntime();
  sup.start();
  sup.crash();
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    isolationDenied: denied.code === "MEMORY_ISOLATION_DENIED",
    copies,
    offsite: false,
    alwaysOn: design(),
    supervisor: sup.status(),
    official: verifyOfficialFile(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
    hardware: probeHardware(),
  };
}

module.exports = { runPhase16 };
