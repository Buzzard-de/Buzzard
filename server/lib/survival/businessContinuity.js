/**
 * Business continuity targets and isolated recon. Not production DR.
 */
const TARGETS = Object.freeze({
  rpoPaymentsMinutes: 15,
  rtoReadOnlyHours: 4,
  scheme: "3-2-1-1-0",
  measuredOnProduction: false,
});

function inventory({ backups = [] } = {}) {
  return {
    copies: backups.length,
    offsite: false,
    worm: false,
    encryptedDesign: true,
    encryptedImplemented: false,
    productionReady: false,
    targets: TARGETS,
  };
}

function reconcileSynthetic({ orders = 0, paid = 0, returns = 0, inventoryQty = 0 } = {}) {
  const mismatch = paid > orders;
  return {
    ok: !mismatch,
    orders,
    paid,
    returns,
    inventoryQty,
    supplierReimbursementAssumed: false,
    productionDrVerified: false,
  };
}

function restoreProduction() {
  return { ok: false, code: "HUMAN_RESTORE_APPROVED_REQUIRED", productionTouched: false };
}

module.exports = { TARGETS, inventory, reconcileSynthetic, restoreProduction };
