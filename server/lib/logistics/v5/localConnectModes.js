const MODES = Object.freeze(["API_XML", "CSV_SFTP_PORTAL", "MANUAL_ASSISTED"]);

function connectMode(mode) {
  const m = String(mode || "").toUpperCase();
  const ok = MODES.includes(m) || m === "API_XML";
  return {
    mode: MODES.includes(m) ? m : "UNKNOWN",
    joinsCommonCarrierModel: true,
    pretendsToBeApi: m === "MANUAL_ASSISTED" ? false : m === "API_XML",
    trackingRecordsAllowed: true,
    live: false,
    supported: ok || MODES.includes(m),
  };
}

module.exports = { MODES, connectMode };
