/**
 * Buzzard Automotive & Motor Vehicles Core Engine — unified facade.
 */
const safetyPolicy = require("./safetyPolicy");
const categoryEngine = require("./categoryEngine");
const productEngine = require("./productEngine");
const identityEngine = require("./identityEngine");
const vehicleEngine = require("./vehicleEngine");
const fitmentEngine = require("./fitmentEngine");
const tireEngine = require("./tireEngine");
const supplierEngine = require("./supplierEngine");
const tecdocAdapter = require("./tecdocAdapter");
const oemEngine = require("./oemEngine");
const priceEngine = require("./priceEngine");
const stockEngine = require("./stockEngine");
const orderEngine = require("./orderEngine");
const aiMatchingEngine = require("./aiMatchingEngine");
const ingestionPipeline = require("./ingestionPipeline");
const auditLog = require("./auditLog");
const health = require("./health");
const searchBridge = require("./searchBridge");
const errors = require("./errors");

function getEngineManifest() {
  return {
    name: "Buzzard Automotive Core Engine",
    version: "1.0.0",
    categories: 12,
    modules: [
      "categoryEngine", "productEngine", "identityEngine", "vehicleEngine",
      "fitmentEngine", "tireEngine", "supplierEngine", "tecdocAdapter",
      "oemEngine", "priceEngine", "stockEngine", "orderEngine",
      "aiMatchingEngine", "ingestionPipeline", "searchBridge",
    ],
    safety: safetyPolicy.AUTOMOTIVE_CORE_SAFETY,
  };
}

module.exports = {
  ...safetyPolicy,
  ...categoryEngine,
  ...productEngine,
  ...identityEngine,
  ...vehicleEngine,
  ...fitmentEngine,
  ...tireEngine,
  ...supplierEngine,
  ...tecdocAdapter,
  ...oemEngine,
  ...priceEngine,
  ...stockEngine,
  ...orderEngine,
  ...aiMatchingEngine,
  ...ingestionPipeline,
  ...auditLog,
  ...health,
  ...searchBridge,
  ...errors,
  getEngineManifest,
};
