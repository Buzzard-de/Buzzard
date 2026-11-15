# Supplier vs carrier

{
  "supplier": {
    "role": "SUPPLIER",
    "preparesGoods": true,
    "reportsWeightAndDimensions": true,
    "reportsOriginAddress": true,
    "handsParcelToCarrier": true,
    "isCarrier": false
  },
  "carrier": {
    "role": "CARRIER",
    "acceptsParcel": true,
    "transports": true,
    "tracking": true,
    "delivers": true,
    "acceptsReturns": true,
    "isSupplier": false
  },
  "supplierCarrierRelation": {
    "code": "SUPPLIER_CARRIER",
    "allowedOnlyIfOwnFleetVerified": true,
    "verifiedRelations": []
  },
  "subcontractorsOfSupplierAreNotSupplierFleet": true,
  "selectionRequiresOriginAndDestination": true,
  "relationTypes": [
    "SUPPLIER_USES_CARRIER",
    "SUPPLIER_CARRIER",
    "CARRIER_USES_SUBCONTRACTOR"
  ],
  "verifiedSupplierUsesCarrier": [],
  "verifiedCarrierUsesSubcontractor": [],
  "live": false
}

Verified SUPPLIER_USES_CARRIER and CARRIER_USES_SUBCONTRACTOR lists are empty. No supplier is treated as having an own fleet.
