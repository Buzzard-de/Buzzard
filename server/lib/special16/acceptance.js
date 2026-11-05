/**
 * Single acceptance framework for the 16 special requirements.
 */
const { assessTextile } = require("../storefront/textileProgram");
const { coverage } = require("../storefront/holidayProgram");
const { POOL_COUNTRIES } = require("../commerce/taxPools");
const { inventory } = require("../compliance/taxConnect");
const { assessVoice, providerAdapters } = require("../voice/councilVoice");
const { evaluateDevice } = require("../security/deviceStandard");
const { coverage: backupCoverage } = require("../survival/backupCoverage");
const { inventory: carrierInventory } = require("../commerce/carrierAdapters");
const { SOURCE_ADAPTERS } = require("../commerce/sanctionsScreen");
const { scan } = require("../security/claudeScan");
const { assessMessaging } = require("../council/e2eeAssessment");
const { inventory: sandboxInventory } = require("../integrations/sandboxReadiness");
const { classify } = require("../security/toolchainRisk");

const GATE_STATUSES = Object.freeze([
  "NOT_STARTED",
  "CODE_READY",
  "INTEGRATED",
  "TESTED",
  "SANDBOX_VERIFIED",
  "LIVE_VERIFIED",
  "BLOCKED",
  "HUMAN_APPROVAL_REQUIRED",
]);

const STATUSES = GATE_STATUSES;

function row(partial) {
  return {
    complete: false,
    live: false,
    sandboxVerified: false,
    liveVerified: false,
    evidence: partial.evidence || "synthetic-unit",
    ...partial,
  };
}

function matrix() {
  const textile = assessTextile();
  const holidays = coverage();
  const voice = assessVoice();
  const device = evaluateDevice();
  const backup = backupCoverage();
  const claude = scan();
  return [
    row({
      id: 1,
      name: "Textile AI",
      status: "TESTED",
      blocker: "licensed video + image model",
      deps: textile.missing,
    }),
    row({
      id: 2,
      name: "AB-27 logistics",
      status: "TESTED",
      blocker: "carrier sandbox credentials",
      adapters: carrierInventory().length,
    }),
    row({
      id: 3,
      name: "Sanctions / trade",
      status: "TESTED",
      blocker: "official live feeds",
      sources: SOURCE_ADAPTERS.length,
    }),
    row({
      id: 4,
      name: "Privacy / legal disclosure",
      status: "TESTED",
      blocker: "legal counsel for live requests",
    }),
    row({
      id: 5,
      name: "Tax pools 26",
      status: "TESTED",
      blocker: "live books",
      poolCountries: POOL_COUNTRIES.length,
    }),
    row({
      id: 6,
      name: "AB-27 national days",
      status: holidays.missingCountries.length ? "CODE_READY" : "TESTED",
      blocker: "homepage publish + copyright",
    }),
    row({
      id: 7,
      name: "Tax connect",
      status: "BLOCKED",
      blocker: "official APIs/certificates",
      channels: inventory().length,
    }),
    row({
      id: 8,
      name: "Doğu Bey research",
      status: "TESTED",
      blocker: "live web fetch not authorized",
    }),
    row({
      id: 9,
      name: "Phone / council voice",
      status: "BLOCKED",
      live: voice.liveCalls === true,
      blocker: "SIP/Twilio + E2E call",
      adapters: providerAdapters(),
    }),
    row({
      id: 10,
      name: "Secure council messaging",
      status: assessMessaging().status,
      blocker: "independent E2EE review",
    }),
    row({
      id: 11,
      name: "Device security",
      status: device.attestedFromDevice ? "HUMAN_APPROVAL_REQUIRED" : "CODE_READY",
      blocker: "operator hardware proof",
    }),
    row({
      id: 12,
      name: "Acceptance framework",
      status: "TESTED",
      blocker: null,
    }),
    row({
      id: 13,
      name: "Claude independence",
      status: claude.integrated ? "BLOCKED" : "TESTED",
      blocker: null,
    }),
    row({
      id: 14,
      name: "Cursor maintenance",
      status: "TESTED",
      blocker: "24/7 runtime not claimed",
    }),
    row({
      id: 15,
      name: "AI privacy / egress",
      status: "TESTED",
      blocker: "absolute no-egress not claimed",
    }),
    row({
      id: 16,
      name: "BCDR",
      status: backup.status,
      blocker: "offsite/WORM + production restore",
      backup: backup.status,
    }),
  ];
}

function completeClaim() {
  return matrix().every((item) => item.status === "LIVE_VERIFIED" && item.complete);
}

function healthPayload() {
  const requirements = matrix();
  const liveVerifiedCount = requirements.filter((r) => r.status === "LIVE_VERIFIED").length;
  return {
    success: false,
    completeClaim: completeClaim(),
    liveVerified: false,
    liveVerifiedCount,
    salesEnabled: false,
    paymentsEnabled: false,
    statuses: GATE_STATUSES,
    requirements,
    sandbox: sandboxInventory(),
    toolchain: classify(),
    note: "Endpoint reports software status only. success=false until every requirement is LIVE_VERIFIED.",
  };
}

module.exports = { STATUSES, GATE_STATUSES, matrix, completeClaim, healthPayload };
