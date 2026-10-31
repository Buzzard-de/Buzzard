const { RETURN_REASONS, LIABILITY_TYPES } = require("./constants");

function determineLiability(reason) {
  const normalized = String(reason || "").toUpperCase();

  if (normalized === RETURN_REASONS.WRONG_PRODUCT_SENT) {
    return {
      supplierLiability: LIABILITY_TYPES.SUPPLIER,
      customerLiability: LIABILITY_TYPES.CUSTOMER,
      buzzardLiability: LIABILITY_TYPES.BUZZARD,
      carrierLiability: LIABILITY_TYPES.UNKNOWN,
      decisionStatus: "RESOLVED",
    };
  }
  if (normalized === RETURN_REASONS.SUPPLIER_ERROR) {
    return {
      supplierLiability: LIABILITY_TYPES.SUPPLIER,
      customerLiability: LIABILITY_TYPES.CUSTOMER,
      buzzardLiability: LIABILITY_TYPES.BUZZARD,
      carrierLiability: LIABILITY_TYPES.UNKNOWN,
      decisionStatus: "RESOLVED",
    };
  }
  if (normalized === RETURN_REASONS.PRODUCT_DEFECT) {
    return {
      supplierLiability: LIABILITY_TYPES.UNKNOWN,
      customerLiability: LIABILITY_TYPES.CUSTOMER,
      buzzardLiability: LIABILITY_TYPES.BUZZARD,
      carrierLiability: LIABILITY_TYPES.UNKNOWN,
      decisionStatus: "REVIEW_REQUIRED",
    };
  }
  if (normalized === RETURN_REASONS.TRANSPORT_DAMAGE) {
    return {
      supplierLiability: LIABILITY_TYPES.UNKNOWN,
      customerLiability: LIABILITY_TYPES.CUSTOMER,
      buzzardLiability: LIABILITY_TYPES.BUZZARD,
      carrierLiability: LIABILITY_TYPES.CARRIER,
      decisionStatus: "RESOLVED",
    };
  }
  if (
    normalized === RETURN_REASONS.CUSTOMER_WRONG_SIZE ||
    normalized === RETURN_REASONS.CUSTOMER_CHANGE_OF_MIND ||
    normalized === RETURN_REASONS.CUSTOMER_WRONG_ORDER ||
    normalized === RETURN_REASONS.CUSTOMER_WRONG_PRODUCT
  ) {
    return {
      supplierLiability: LIABILITY_TYPES.CUSTOMER,
      customerLiability: LIABILITY_TYPES.CUSTOMER,
      buzzardLiability: LIABILITY_TYPES.BUZZARD,
      carrierLiability: LIABILITY_TYPES.UNKNOWN,
      decisionStatus: "RESOLVED",
    };
  }

  return {
    supplierLiability: LIABILITY_TYPES.UNKNOWN,
    customerLiability: LIABILITY_TYPES.UNKNOWN,
    buzzardLiability: LIABILITY_TYPES.BUZZARD,
    carrierLiability: LIABILITY_TYPES.UNKNOWN,
    decisionStatus: "REVIEW_REQUIRED",
  };
}

function applyLiabilityToCase(returnCase) {
  const liability = determineLiability(returnCase.reason);
  return {
    ...returnCase,
    supplierLiability: liability.supplierLiability,
    customerLiability: liability.customerLiability,
    buzzardLiability: liability.buzzardLiability,
    carrierLiability: liability.carrierLiability,
    decisionStatus: liability.decisionStatus,
  };
}

module.exports = { determineLiability, applyLiabilityToCase };
