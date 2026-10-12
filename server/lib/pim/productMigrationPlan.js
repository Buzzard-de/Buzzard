/**
 * Local Product SoT migration *simulation*.
 * Does not write stores, activate SoT, dual-write, or unlock sales.
 */

const architecture = require("./productArchitecture");

function simulateProductMigration() {
  const map = architecture.getProductArchitecture();
  return {
    simulation: true,
    written: false,
    dualWrite: false,
    productSourceOfTruthActive: false,
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    candidate: map.candidate,
    stores: map.stores,
    writers: map.masterWriters.map((row) => row.id),
    readers: map.readers.map((row) => row.id),
    classifiedNonMaster: map.classifiedNonMaster.map((row) => ({ id: row.id, class: row.class })),
    identityMapping: {
      required: ["sku", "ean", "gtin"],
      implemented: false,
      note: "Cross-store identity map is a migration prerequisite, not this simulation.",
    },
    duplicatePolicy: "fail-closed per store; no auto-merge across stores",
    backupRollback: [
      "Take a filesystem copy of the SQLite file and data/buzzard_products.json",
      "Do not restore production from this simulation",
    ],
    readerCutoverOrder: map.readers.map((row) => row.id),
    verificationQueries: [
      "COUNT(*) by sku across stores after mapping exists",
      "No ACTIVE creates while sales locked",
    ],
    humanApprovals: ["canonical store selection", "migration window", "SoT activation (separate)", "sales unlock (separate)"],
    nextUnauthorized: ["activate SoT", "unlock sales", "production migrate"],
  };
}

module.exports = { simulateProductMigration };
