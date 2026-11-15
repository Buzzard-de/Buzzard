/**
 * AB-27 carrier adapters. Dry-run only. Live shipment/label creation is blocked.
 */
const { AB27 } = require("./ab27Tax");

const NATIONAL_POST = Object.freeze({
  AT: "OSTERREICHISCHE_POST",
  BE: "BPOST",
  BG: "BULGARIAN_POST",
  CY: "CYPRUS_POST",
  CZ: "CESKA_POSTA",
  DE: "DEUTSCHE_POST",
  DK: "POSTNORD_DK",
  EE: "OMNIVA",
  EL: "ELTA",
  ES: "CORREOS",
  FI: "POSTI",
  FR: "LA_POSTE",
  HR: "HP_HRVATSKA",
  HU: "MAGYAR_POSTA",
  IE: "AN_POST",
  IT: "POSTE_ITALIANE",
  LT: "LP_EXPRESS",
  LU: "POST_LUXEMBOURG",
  LV: "LATVIJAS_PASTS",
  MT: "MALTAPOST",
  NL: "POSTNL",
  PL: "POCZTA_POLSKA",
  PT: "CTT",
  RO: "POSTA_ROMANA",
  SE: "POSTNORD_SE",
  SI: "POSTA_SLOVENIJE",
  SK: "SLOVENSKA_POSTA",
});

const NETWORKS = Object.freeze(["DHL", "HERMES", "DPD", "GLS", "UPS", "AMAZON_LOGISTICS"]);
const FLOWS = Object.freeze(["quote", "label", "track", "pickup", "locker", "insurance", "surcharge", "return", "cancel"]);

function capability(country, network) {
  if (network === "HERMES") return ["DE", "AT", "NL", "BE"].includes(country);
  if (network === "AMAZON_LOGISTICS") return ["DE", "FR", "IT", "ES"].includes(country);
  if (network === "DPD" || network === "GLS") return !["CY", "MT"].includes(country);
  return true;
}

function adapterStatus(country, network) {
  return {
    country,
    network,
    capable: capability(country, network),
    auth: false,
    connected: false,
    sandbox: false,
    live: false,
    flows: Object.fromEntries(FLOWS.map((flow) => [flow, "DRY_RUN"])),
    status: "BLOCKED",
    reason: "No carrier sandbox credential in this environment.",
  };
}

function inventory() {
  return AB27.flatMap((country) => [
    ...NETWORKS.map((network) => adapterStatus(country, network)),
    {
      country,
      network: NATIONAL_POST[country],
      capable: true,
      auth: false,
      connected: false,
      sandbox: false,
      live: false,
      flows: Object.fromEntries(FLOWS.map((flow) => [flow, "DRY_RUN"])),
      status: "BLOCKED",
      reason: "National post API not configured.",
    },
  ]);
}

function dryRun({ network = "DHL", destination, action = "quote" } = {}) {
  const dest = String(destination || "").toUpperCase();
  const destKey = dest === "GR" ? "EL" : dest;
  if (!AB27.includes(destKey)) return { ok: false, code: "UNKNOWN_DESTINATION", live: false };
  if (action === "label" || action === "create_shipment") {
    return { ok: false, code: "LIVE_SHIPMENT_BLOCKED", live: false, dryRun: true, action };
  }
  return {
    ok: true,
    dryRun: true,
    live: false,
    network,
    destination: destKey,
    action,
    status: "BLOCKED",
  };
}

module.exports = { NATIONAL_POST, NETWORKS, FLOWS, inventory, dryRun, adapterStatus };
