/**
 * Domain router. Lazy-loads engines so automotive requests never execute agri/construction rules.
 */

const { resolveMachineryDomain, DOMAINS } = require("./isolation");

function loadEngine(domain) {
  if (domain === DOMAINS.AGRICULTURAL) {
    return require("../agriculturalMachinery").getEngine();
  }
  if (domain === DOMAINS.CONSTRUCTION) {
    return require("../constructionMachinery").getEngine();
  }
  if (domain === DOMAINS.AUTOMOTIVE) {
    return require("../vehiclePartsIntelligence").getEngine();
  }
  return null;
}

function routeCompatibility(query = {}) {
  const domain = resolveMachineryDomain(query);
  const engine = loadEngine(domain);
  if (!engine) {
    return {
      state: "INSUFFICIENT_DATA",
      rejectedDomain: domain,
      explanation: "No machinery/vehicle domain resolved.",
      routedEngine: null,
    };
  }
  const decision = engine.evaluate(query);
  return { ...decision, routedEngine: engine.domain || domain, routedDomain: domain };
}

function routeSearch(query = {}) {
  const domain = resolveMachineryDomain(query);
  const engine = loadEngine(domain);
  if (!engine) return { items: [], total: 0, routedEngine: null, rejectedDomain: domain };
  return { ...engine.search(query), routedEngine: engine.domain || domain, routedDomain: domain };
}

module.exports = { routeCompatibility, routeSearch, loadEngine };
