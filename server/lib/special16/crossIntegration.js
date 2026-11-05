/**
 * Cross-requirement wiring inside the existing modular monolith.
 */
const { createTask, getMember } = require("../pusat/council");
const { recommend } = require("../storefront/textileProgram");
const { compareCarriers } = require("../commerce/ab27Logistics");
const { screenCompliance } = require("../commerce/sanctionsScreen");
const { postNetIncome } = require("../commerce/taxPools");
const { enqueueCountryReport } = require("../commerce/taxConnect");

function textileToCatalog({ audience, occasion } = {}) {
  const rec = recommend({ audience, occasion });
  return { ...rec, catalogHook: "cat-01", pimWrite: false };
}

function logisticsToOrder({ destination, weightKg } = {}) {
  const quote = compareCarriers({ destination, weightKg });
  return { ...quote, orderWrite: false, liveCarrier: false };
}

function customsToTax({ destination, netIncome } = {}) {
  const screen = screenCompliance({ destination, value: netIncome });
  const tax = destination && destination !== "DE" ? postNetIncome({ country: destination, netIncome: 0 }) : null;
  return { screen, taxDraft: tax, autoClear: false };
}

function taxToConnect({ country, netAmount } = {}) {
  return enqueueCountryReport({ country, netAmount });
}

function pusatCoordinates({ fromId = "textile_ai", title = "special16-review" } = {}) {
  if (!getMember("pusat")) return { ok: false };
  return createTask({ fromId, title, assigneeId: "pusat" });
}

module.exports = {
  textileToCatalog,
  logisticsToOrder,
  customsToTax,
  taxToConnect,
  pusatCoordinates,
};
