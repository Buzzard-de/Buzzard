/**
 * TecDoc integration facade — mock data when credentials absent.
 */
const tecdocAdapter = require("./tecdocAdapter");

function status() {
  const configured = Boolean(process.env.TECDOC_API_KEY);
  return {
    configured,
    live: false,
    mode: configured ? "CONFIGURED_MOCK" : "UNAVAILABLE",
    networkEgress: false,
    note: configured
      ? "Credentials present but live TecDoc calls remain blocked until authorized."
      : "TecDoc credentials not configured; vehicle/compatibility uses isolated mock.",
  };
}

async function lookupVehicle(query) {
  const st = status();
  if (!st.configured && !query.allowMock) {
    return { ok: false, code: "TECDOC_UNAVAILABLE", vehicles: [], ...st };
  }
  return { ok: true, vehicles: tecdocAdapter.lookupVehicle(query), ...st, mock: true };
}

async function compatibility(articleOrSku) {
  const st = status();
  const rows = tecdocAdapter.getCompatibility(articleOrSku);
  if (!rows.length && !st.configured) {
    return { ok: false, code: "FITMENT_UNAVAILABLE", matches: [], ...st };
  }
  return { ok: true, matches: rows, ...st, mock: true };
}

module.exports = { status, lookupVehicle, compatibility };