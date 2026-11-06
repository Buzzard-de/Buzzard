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
    live: false,
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

module.exports = { roleModel, classifyParty };
