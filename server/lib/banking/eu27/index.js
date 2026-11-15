/**
 * EU-27 fiat banking engine. Sandbox architecture only.
 * It does not open a bank session, take a card, or enable sales.
 */
const fiatPolicy = require("./fiatPolicy");
const inventory = require("./inventory");
const connectors = require("./connectors");
const payments = require("./payments");
const routing = require("./routing");
const ledger = require("./ledger");
const engines = require("./engines");
const compliance = require("./compliance");
const council = require("./council");
const messages = require("./messages");
const fx = require("./fx");
const fraud = require("./fraud");
const continuation = require("./continuation");

function readiness() {
  const report = inventory.coverage();
  return {
    name: "EU-27 GLOBAL BANKING & FIAT PAYMENT ENGINE",
    policy: fiatPolicy.POLICY.id,
    countries: report.countryCount,
    quotedEntities: report.quotedEntities,
    complete: false,
    liveVerified: false,
    productionReady: false,
    salesEnabled: false,
    moneyMoved: false,
  };
}

module.exports = {
  ...fiatPolicy,
  ...inventory,
  ...connectors,
  ...payments,
  ...routing,
  ...ledger,
  ...engines,
  ...compliance,
  ...council,
  ...messages,
  ...fx,
  ...fraud,
  ...continuation,
  readiness,
};
