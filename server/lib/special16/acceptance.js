/**
 * Single acceptance framework for the 16 special requirements.
 */
const { assessTextile } = require("../storefront/textileProgram");
const { coverage } = require("../storefront/holidayProgram");
const { POOL_COUNTRIES } = require("../commerce/taxPools");
const { inventory } = require("../compliance/taxConnect");
const { assessVoice } = require("../voice/councilVoice");
const { assessBackupLock } = require("../survival/backupLock");
const { evaluateDevice } = require("../security/deviceStandard");

const STATUSES = Object.freeze([
  "COMMAND_GIVEN",
  "CODE_IN_PROGRESS",
  "CODE_READY",
  "INTEGRATION_READY",
  "INTEGRATED",
  "TESTED",
  "SANDBOX_VERIFIED",
  "LIVE_VERIFIED",
  "PARTIAL",
  "BLOCKED",
  "NEEDS_APPROVAL",
]);

function matrix() {
  const textile = assessTextile();
  const holidays = coverage();
  const voice = assessVoice();
  const backup = assessBackupLock();
  const device = evaluateDevice();
  return [
    { id: 1, name: "Textile AI", status: "TESTED", live: false, blocker: "licensed video + image model" },
    { id: 2, name: "AB-27 logistics", status: "TESTED", live: false, blocker: "carrier sandbox credentials" },
    { id: 3, name: "Sanctions / trade", status: "TESTED", live: false, blocker: "official live feeds" },
    { id: 4, name: "Privacy / legal disclosure", status: "TESTED", live: false, blocker: "legal counsel for live requests" },
    { id: 5, name: "Tax pools 26", status: "TESTED", live: false, blocker: "none for synthetic ledger; live books NEEDS_APPROVAL" },
    { id: 6, name: "AB-27 national days", status: holidays.missingCountries.length ? "PARTIAL" : "TESTED", live: false, blocker: "homepage publish + copyright" },
    { id: 7, name: "Tax connect", status: "BLOCKED", live: false, blocker: "official APIs/certificates", channels: inventory().length },
    { id: 8, name: "Doğu Bey research", status: "TESTED", live: false, blocker: "live web fetch not authorized" },
    { id: 9, name: "Phone / council voice", status: voice.status, live: voice.liveCalls, blocker: "SIP/Twilio + E2E call" },
    { id: 10, name: "Secure council messaging", status: "TESTED", live: false, blocker: "E2EE architecture approval" },
    { id: 11, name: "Device security", status: device.acceptanceStatus || "CODE_READY", live: false, blocker: "operator hardware proof" },
    { id: 12, name: "Acceptance framework", status: "TESTED", live: false, blocker: null },
    { id: 13, name: "Claude independence", status: "TESTED", live: false, blocker: null },
    { id: 14, name: "Cursor maintenance", status: "TESTED", live: false, blocker: "24/7 runtime not claimed" },
    { id: 15, name: "AI privacy / egress", status: "TESTED", live: false, blocker: "absolute no-egress not claimed" },
    { id: 16, name: "BCDR", status: "TESTED", live: false, blocker: "offsite/WORM + production restore", backupCode: backup.code },
  ].map((row) => ({
    ...row,
    complete: false,
    poolCountries: row.id === 5 ? POOL_COUNTRIES.length : undefined,
  }));
}

function completeClaim() {
  return matrix().every((row) => row.status === "LIVE_VERIFIED" && row.complete);
}

module.exports = { STATUSES, matrix, completeClaim };
