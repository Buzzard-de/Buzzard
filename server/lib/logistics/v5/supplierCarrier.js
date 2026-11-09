/**
 * Dropshipping: supplier and carrier stay separate records.
 */
function roleModel() {
  return {
    supplier: {
      role: "SUPPLIER",
      preparesGoods: true,
      reportsWeightAndDimensions: true,
      reportsOriginAddress: true,
      handsParcelToCarrier: true,
      isCarrier: false,
    },
    carrier: {
      role: "CARRIER",
      acceptsParcel: true,
      transports: true,
      tracking: true,
      delivers: true,
      acceptsReturns: true,
      isSupplier: false,
    },
    supplierCarrierRelation: {
      code: "SUPPLIER_CARRIER",
      allowedOnlyIfOwnFleetVerified: true,
      verifiedRelations: [],
    },
    subcontractorsOfSupplierAreNotSupplierFleet: true,
    selectionRequiresOriginAndDestination: true,
    relationTypes: ["SUPPLIER_USES_CARRIER", "SUPPLIER_CARRIER", "CARRIER_USES_SUBCONTRACTOR"],
    verifiedSupplierUsesCarrier: [],
    verifiedCarrierUsesSubcontractor: [],
    cardinality: {
      supplierToCarriers: "0..n",
      carrierToSuppliers: "0..n",
    },
    edges: [],
    live: false,
  };
}

function linkSupplierCarrier({ supplierId, carrierId, ownFleetVerified = false } = {}) {
  if (!supplierId || !carrierId) {
    return { ok: false, error: "MISSING_IDS", edges: [] };
  }
  if (supplierId === carrierId && !ownFleetVerified) {
    return { ok: false, error: "SUPPLIER_IS_NOT_CARRIER_WITHOUT_OWN_FLEET", edges: [] };
  }
  return {
    ok: true,
    live: false,
    edge: { type: "SUPPLIER_USES_CARRIER", supplierId, carrierId, verified: false },
  };
}

function classifyParty({ ownFleetVerified = false, suppliesGoods = false, transports = false } = {}) {
  if (suppliesGoods && transports) {
    return {
      role: ownFleetVerified ? "SUPPLIER_CARRIER" : "SUPPLIER_USES_UNVERIFIED_TRANSPORT",
      mergeForbidden: !ownFleetVerified,
    };
  }
  if (suppliesGoods) return { role: "SUPPLIER", mergeForbidden: false };
  if (transports) return { role: "CARRIER", mergeForbidden: false };
  return { role: "UNKNOWN", mergeForbidden: true };
}

module.exports = { roleModel, classifyParty, linkSupplierCarrier };
