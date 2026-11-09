function dashboardSnapshot(master) {
  return {
    theme: "buzzard-black-gold",
    newBrandIdentity: false,
    salesToggle: false,
    liveShipment: false,
    totals: {
      namedEntities: master.uniqueNamedLegalInDatabase,
      uniqueLegal: master.uniqueLegalByCompanyKey,
      parcelVerified: master.independentCounts?.parcel_service_true ?? 0,
      apiDocs: master.documentationCatalog?.length ?? 0,
      sandboxVerified: master.sandboxVerifiedCarriers,
      liveUsable: master.technicallyUsableLiveCarriers,
      postcodeCountries: 0,
    },
    delays: "UNKNOWN",
    costs: "UNKNOWN",
  };
}

module.exports = { dashboardSnapshot };
