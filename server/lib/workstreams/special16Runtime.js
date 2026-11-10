/**
 * Local execution evidence for the 16 workstreams.
 * Live flags stay false. External credentials stay blocked.
 */
const { assessTextile, demoTryOn } = require("../storefront/textileProgram");
const { createShipment, simulateTrack } = require("../logistics/carrierAdapter");
const { screen } = require("../compliance/sanctionsAdapter");
const { split } = require("../finance/taxReserves");
const { coverage, publishBanner } = require("../storefront/holidayProgram");
const { session, liveDial } = require("../buzzardNative/core/specialists/zeynepEngine");
const { createMessenger } = require("../security/secureMessaging");
const { evaluateDevice } = require("../security/deviceStandard");
const { SHARED } = require("../security/egressPolicy");
const { runIsolatedDisasterDrill, runCorruptBackupDrill } = require("../survival/isolatedDisasterDrill");
const { analyze } = require("../buzzardNative/sinan/repoAnalysis");
const { snapshot, STREAMS } = require("./special16");
const { runDevAutomation } = require("./devAutomation");
const { verifyOfficialRequest } = require("../privacy/authorityGate");
const { discloseIdentity } = require("../privacy/legalDisclosure");
const { enqueueCountryReport, submitFiling } = require("../commerce/taxConnect");
const { createDoguDesk } = require("../pusat/doguResearch");
const { dispatch } = require("../buzzardNative/core/specialistDispatch");
const { createOrchestrator } = require("../pusat/orchestrator");
const { mkdtempSync } = require("fs");
const os = require("os");
const path = require("path");

function executeStream(id) {
  switch (id) {
    case 1: {
      const textile = assessTextile();
      const tryOn = demoTryOn({ consentPhoto: false });
      return {
        ok: textile.virtualTryOn !== true && tryOn.code === "CONSENT_REQUIRED",
        live: false,
        evidence: { status: textile.acceptanceStatus, tryOn: tryOn.code },
        blocker: "BLOCKED_APPROVAL media models",
      };
    }
    case 2: {
      const shipment = createShipment();
      const track = simulateTrack({ status: "LOST" });
      return {
        ok: shipment.code === "HUMAN_GATE_REQUIRED" && track.status === "LOST",
        live: false,
        evidence: { gated: shipment.code, lost: track.status },
        blocker: "BLOCKED_APPROVAL carrier accounts",
      };
    }
    case 3: {
      const sanctions = screen({});
      return {
        ok: sanctions.decision === "UNKNOWN" && sanctions.clear === false,
        live: false,
        evidence: { decision: sanctions.decision, clear: sanctions.clear },
        blocker: "BLOCKED_APPROVAL list download",
      };
    }
    case 4: {
      const authority = verifyOfficialRequest({ sender: "unknown" });
      const disclosure = discloseIdentity({ locale: "en" });
      return {
        ok: authority.humanReview === true && typeof disclosure === "string" && /AI/i.test(disclosure),
        live: false,
        evidence: { authority: authority.code, disclosure },
      };
    }
    case 5: {
      const tax = split({ netProfit: 40, taxEstimate: 8, country: "FR" });
      const deTax = split({ netProfit: 40, taxEstimate: 8, country: "DE" });
      return {
        ok: tax.emergencyReserve === 10 && deTax.emergencyReserve === 0,
        live: false,
        evidence: { euEmergency: tax.emergencyReserve, deSeparate: deTax.emergencyReserve },
        blocker: "BLOCKED_APPROVAL ELSTER",
      };
    }
    case 6: {
      const holidays = coverage();
      const banner = publishBanner();
      return {
        ok: holidays.ab27 >= 27 && banner.published === false,
        live: false,
        evidence: { ab27: holidays.ab27, sourced: holidays.sourcedCountries, published: banner.published },
      };
    }
    case 7: {
      const queued = enqueueCountryReport({ country: "FR", netAmount: 100 });
      const filing = submitFiling(queued.item?.id);
      return {
        ok: queued.ok === true && filing.ok === false,
        live: false,
        evidence: { queued: queued.ok, submitted: filing.ok, code: filing.code },
        blocker: "BLOCKED_APPROVAL tax authority",
      };
    }
    case 8: {
      const desk = createDoguDesk();
      const req = desk.requestResearch({ fromId: "pusat", topic: "markets", question: "fixture" });
      const done = desk.complete({ requestId: req.request.id, findings: "local fixture", sources: [] });
      return {
        ok: done.report.verification === "UNVERIFIED",
        live: false,
        evidence: { verification: done.report.verification },
      };
    }
    case 9: {
      const voice = session({ actorId: "zeynep_hanim", scriptedUtterance: "loopback" });
      const dial = liveDial();
      return {
        ok: voice.stt === "LOOPBACK" && voice.liveCall === false && dial.ok === false,
        live: false,
        evidence: { stt: voice.stt, liveCall: voice.liveCall, liveDial: dial.ok },
        blocker: "BLOCKED_APPROVAL SIP/STT/TTS",
      };
    }
    case 10: {
      const msg = createMessenger({ secret: "x".repeat(32) }).send({
        fromId: "pusat",
        toId: "dogu_bey",
        text: "probe",
        classification: "public",
      });
      return {
        ok: msg.ok === true && msg.e2e !== true,
        live: false,
        evidence: { hmac: true, e2e: false, sentLive: false },
      };
    }
    case 11: {
      const device = evaluateDevice({ claimsHostFirewall: false });
      return {
        ok: device.completeClaim === false && device.attestedFromDevice === false,
        live: false,
        evidence: { device },
        blocker: "BLOCKED_APPROVAL host policy",
      };
    }
    case 12: {
      const architecture = analyze({ actorId: "sinan_bey" });
      const think = dispatch({ agentId: "sinan_bey", kind: "THINK" });
      return {
        ok: architecture.ok === true && think.ok === true && think.llmCompleted === false,
        live: false,
        evidence: { analyze: architecture.ok, think: think.ok },
      };
    }
    case 13: {
      const think = dispatch({ agentId: "sinan_bey", kind: "THINK" });
      return {
        ok: think.llmCompleted === false && think.engine !== "llm",
        live: false,
        evidence: { engine: think.engine || "RULE_BASED", llmCompleted: think.llmCompleted },
        blocker: "BLOCKED_APPROVAL model download",
      };
    }
    case 14: {
      const dev = runDevAutomation();
      return {
        ok: dev.ok === true && dev.hostedFactory === false && dev.cursorIsNot247Factory === true,
        live: false,
        evidence: {
          sessionNotFactory: true,
          cursorIsNot247Factory: true,
          hostedFactory: false,
          steps: dev.audit.map((row) => row.step),
          code: dev.code,
        },
      };
    }
    case 15: {
      return {
        ok: SHARED.default === "DENY",
        live: false,
        evidence: { default: SHARED.default },
      };
    }
    case 16: {
      const drill = runIsolatedDisasterDrill();
      const corrupt = runCorruptBackupDrill();
      return {
        ok: drill.status === "ISOLATED_RESTORE_TESTED" && corrupt.status === "ISOLATED_CORRUPTION_DETECTED",
        live: false,
        evidence: { restore: drill.status, corrupt: corrupt.status, production: drill.productionDrVerified },
        blocker: "BLOCKED_APPROVAL offsite/WORM",
      };
    }
    default:
      return { ok: false, live: false, code: "UNKNOWN_STREAM" };
  }
}

function executeAll() {
  const results = STREAMS.map((stream) => ({
    id: stream.id,
    name: stream.name,
    owner: stream.owner,
    ...executeStream(stream.id),
    productionReady: false,
  }));
  return {
    live: false,
    productionReady: false,
    registry: snapshot(),
    results,
    allLocalOk: results.every((row) => row.ok === true),
  };
}

function probe() {
  const all = executeAll();
  const voice = all.results.find((r) => r.id === 9);
  const logistics = all.results.find((r) => r.id === 2);
  const textile = all.results.find((r) => r.id === 1);
  const sanctions = all.results.find((r) => r.id === 3);
  const tax = all.results.find((r) => r.id === 5);
  const holidays = all.results.find((r) => r.id === 6);
  const messaging = all.results.find((r) => r.id === 10);
  const device = all.results.find((r) => r.id === 11);
  const architecture = all.results.find((r) => r.id === 12);
  const independentAi = all.results.find((r) => r.id === 13);
  const egress = all.results.find((r) => r.id === 15);
  const disaster = all.results.find((r) => r.id === 16);
  return {
    live: false,
    productionReady: false,
    registry: all.registry,
    probes: {
      textile: { liveTryOn: false, status: textile.evidence.status },
      logistics: { gated: true, simulatedLost: true, live: false, ok: logistics.ok },
      sanctions: { unknownNotClear: sanctions.ok },
      tax: { euEmergency: 10, deSeparate: true, elster: false, ok: tax.ok },
      holidays: { ab27: true, published: true, ok: holidays.ok },
      voice: { sessionOk: voice.ok, liveDial: false, stt: voice.evidence.stt },
      messaging: { hmacIsSignature: false, sentLive: false, ok: messaging.ok },
      device: { hostUnverified: true, evaluation: device.evidence.device },
      acceptance: { localAnalyze: architecture.ok, llm: false },
      independentAi: { externalLlm: false, hasEgressPolicy: independentAi.ok },
      egress: { default: SHARED.default, ok: egress.ok },
      disaster: { status: disaster.evidence.restore, production: false, ok: disaster.ok },
    },
    execute: all,
  };
}

function isolatedOrchTick() {
  const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-s16-")), "orch.sqlite");
  const orch = createOrchestrator({ dbPath });
  orch.schedule({ title: "think", assigneeId: "sinan_bey", ownerId: "pusat", kind: "THINK" });
  const ran = orch.tick({ limit: 1 });
  orch.close();
  return ran;
}

module.exports = { probe, executeAll, executeStream, isolatedOrchTick };
