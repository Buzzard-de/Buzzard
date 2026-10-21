/**
 * Boot-time fixture seed only. Never calls paid or licensed catalogs.
 * Idempotent: skips when parts already exist.
 */

const CONNECTORS = Object.freeze({
  automotive: { loader: () => require("../vehiclePartsIntelligence").getEngine(), connectorId: "mock-vpe-local" },
  agricultural: { loader: () => require("../agriculturalMachinery").getEngine(), connectorId: "mock-ag-local" },
  construction: { loader: () => require("../constructionMachinery").getEngine(), connectorId: "mock-local" },
});

const inflight = new Map();

async function ensureEngineSeeded(domain) {
  const spec = CONNECTORS[domain];
  if (!spec) return { ok: false, error: "unknown_domain" };
  if (inflight.has(domain)) return inflight.get(domain);
  const work = (async () => {
    const engine = spec.loader();
    const existing = typeof engine.listParts === "function" ? engine.listParts().length : 0;
    if (existing > 0) {
      return { ok: true, skipped: true, domain, parts: existing, connectorId: spec.connectorId };
    }
    const imported = await engine.importFrom(spec.connectorId);
    return {
      ok: Boolean(imported.ok),
      skipped: false,
      domain,
      connectorId: spec.connectorId,
      parts: engine.listParts().length,
      job: imported.job || null,
    };
  })().finally(() => inflight.delete(domain));
  inflight.set(domain, work);
  return work;
}

async function seedAllMockCatalogs() {
  const results = [];
  for (const domain of Object.keys(CONNECTORS)) {
    results.push(await ensureEngineSeeded(domain));
  }
  return {
    ok: results.every((row) => row.ok),
    mock: true,
    liveCalls: false,
    results,
  };
}

module.exports = { ensureEngineSeeded, seedAllMockCatalogs, CONNECTORS };
