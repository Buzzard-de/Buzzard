/**
 * In-repo probes for the 16 workstreams. Live flags stay false.
 */
const { assessTextile } = require("../storefront/textileProgram");
const { createShipment, simulateTrack } = require("../logistics/carrierAdapter");
const { screen } = require("../compliance/sanctionsAdapter");
const { split } = require("../finance/taxReserves");
const { coverage, publishBanner } = require("../storefront/holidayProgram");
const { session, liveDial } = require("../buzzardNative/core/specialists/zeynepEngine");
const { createMessenger } = require("../security/secureMessaging");
const { evaluateDevice } = require("../security/deviceStandard");
const { SHARED } = require("../security/egressPolicy");
const { runIsolatedDisasterDrill } = require("../survival/isolatedDisasterDrill");
const { analyze } = require("../buzzardNative/sinan/repoAnalysis");
const { snapshot } = require("./special16");

function probe() {
  const textile = assessTextile();
  const shipment = createShipment();
  const track = simulateTrack({ status: "LOST" });
  const sanctions = screen({});
  const tax = split({ netProfit: 40, taxEstimate: 8, country: "FR" });
  const deTax = split({ netProfit: 40, taxEstimate: 8, country: "DE" });
  const holidays = coverage();
  const voice = session({ actorId: "zeynep_hanim" });
  const dial = liveDial();
  const msg = createMessenger({ secret: "x".repeat(32) }).send({
    fromId: "pusat",
    toId: "dogu_bey",
    text: "probe",
    classification: "public",
  });
  const device = evaluateDevice({ claimsHostFirewall: false });
  const drill = runIsolatedDisasterDrill();
  const architecture = analyze({ actorId: "sinan_bey" });
  return {
    live: false,
    productionReady: false,
    registry: snapshot(),
    probes: {
      textile: { liveTryOn: textile.virtualTryOn === true, status: textile.acceptanceStatus },
      logistics: { gated: shipment.code === "HUMAN_GATE_REQUIRED", simulatedLost: track.status === "LOST", live: false },
      sanctions: { unknownNotClear: sanctions.decision === "UNKNOWN" && sanctions.clear === false },
      tax: { euEmergency: tax.emergencyReserve === 10, deSeparate: deTax.emergencyReserve === 0, elster: false },
      holidays: { ab27: holidays.ab27, published: publishBanner().published === true },
      voice: { sessionOk: voice.ok === true, liveDial: dial.ok === true, stt: voice.stt },
      messaging: { hmacIsSignature: false, sentLive: false, ok: msg.ok === true },
      device: { hostUnverified: true, evaluation: device },
      acceptance: { localAnalyze: architecture.ok === true, llm: false },
      independentAi: { externalLlm: false, hasEgressPolicy: architecture.hasEgressPolicy },
      egress: { default: SHARED.default },
      disaster: { status: drill.status, production: drill.productionDrVerified === true },
    },
  };
}

module.exports = { probe };
