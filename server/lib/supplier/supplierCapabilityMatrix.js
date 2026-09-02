/**
 * Part 23 — Supplier capability matrix evaluation.
 */
const {
  SUPPLIER_CAPABILITY,
  SUPPLIER_READINESS_STATUS,
} = require("../../core/supplierIntegrationConstants");

const ALL_CAPABILITIES = Object.values(SUPPLIER_CAPABILITY);

function capabilityStatus(supported, credentialsConfigured, requiresLive = false) {
  if (!supported) return SUPPLIER_READINESS_STATUS.UNKNOWN;
  if (requiresLive && !credentialsConfigured) return SUPPLIER_READINESS_STATUS.CONDITION;
  if (supported && !credentialsConfigured) return SUPPLIER_READINESS_STATUS.CONDITION;
  return SUPPLIER_READINESS_STATUS.PASS;
}

function evaluateCapabilityMatrix(supplierDef) {
  const adapterCaps = new Set(supplierDef.capabilities || []);
  const format = String(supplierDef.format || "").toLowerCase();
  const credentialsConfigured = Boolean(supplierDef.credentialsConfigured);

  const matrix = {};
  for (const cap of ALL_CAPABILITIES) {
    let supported = false;
    let requiresLive = false;

    switch (cap) {
      case SUPPLIER_CAPABILITY.API:
        supported = format === "api" || format === "json";
        break;
      case SUPPLIER_CAPABILITY.XML:
        supported = format === "xml";
        break;
      case SUPPLIER_CAPABILITY.CSV:
        supported = format === "csv";
        break;
      case SUPPLIER_CAPABILITY.ORDERS:
      case SUPPLIER_CAPABILITY.SHIPPING:
      case SUPPLIER_CAPABILITY.TRACKING:
        supported = false;
        requiresLive = true;
        break;
      case SUPPLIER_CAPABILITY.DROPSHIPPING:
      case SUPPLIER_CAPABILITY.WHITE_LABEL:
        supported = supplierDef.dropshipping?.[cap] === SUPPLIER_READINESS_STATUS.PASS;
        break;
      default:
        supported =
          adapterCaps.has(cap) ||
          ["catalog", "price", "stock", "gtin", "mpn", "brand", "images", "categories"].includes(cap);
    }

    matrix[cap] = {
      supported,
      status: capabilityStatus(supported, credentialsConfigured, requiresLive),
      credentialsRequired: requiresLive || (supported && !credentialsConfigured),
    };
  }

  if (!credentialsConfigured) {
    matrix.live = {
      supported: false,
      status: SUPPLIER_READINESS_STATUS.BLOCKED,
      reason: "credentials_not_configured",
    };
  } else {
    matrix.live = {
      supported: false,
      status: SUPPLIER_READINESS_STATUS.BLOCKED,
      reason: "live_import_disabled",
    };
  }

  const summary = {
    pass: Object.values(matrix).filter((m) => m.status === SUPPLIER_READINESS_STATUS.PASS).length,
    condition: Object.values(matrix).filter((m) => m.status === SUPPLIER_READINESS_STATUS.CONDITION).length,
    blocked: Object.values(matrix).filter((m) => m.status === SUPPLIER_READINESS_STATUS.BLOCKED).length,
    unknown: Object.values(matrix).filter((m) => m.status === SUPPLIER_READINESS_STATUS.UNKNOWN).length,
  };

  return { matrix, summary, credentialsConfigured, canGoLive: false };
}

module.exports = {
  evaluateCapabilityMatrix,
  ALL_CAPABILITIES,
};
