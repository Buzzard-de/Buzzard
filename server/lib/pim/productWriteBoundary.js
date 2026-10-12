/**
 * Shared product mutation policy boundary.
 *
 * This is not a second orchestrator and not a storage Source of Truth.
 * It does not choose or migrate a product table. Callers keep writing to
 * their existing destination. Dual-write is forbidden. Product SoT stays inactive.
 */

const { PRODUCT_STATUS } = require("../../core/productConstants");
const { isSalesEnabled } = require("../salesMode");
const { resolveSupplierConflict } = require("../software/inventory");

const BOUNDARY_ID = "server/lib/pim/productWriteBoundary";

function isProductSourceOfTruthActive() {
  return false;
}

function isActiveStatus(status) {
  return String(status || "").trim().toUpperCase() === PRODUCT_STATUS.ACTIVE;
}

function fail(reason, message, status = 400, extra = {}) {
  return {
    ok: false,
    persist: false,
    dualWrite: false,
    productSourceOfTruthActive: false,
    salesEnabled: isSalesEnabled(),
    purchaseOwnStock: false,
    boundary: BOUNDARY_ID,
    reason,
    message,
    status,
    ...extra,
  };
}

function authorizeCreate(input = {}, context = {}) {
  if (context.activateSourceOfTruth === true || input.activateSourceOfTruth === true) {
    return fail("SOT_ACTIVATION_BLOCKED", "Product Source of Truth remains inactive");
  }

  const sku = String(input.sku || "").trim();
  if (!sku) {
    return fail("SKU_REQUIRED", "SKU required");
  }

  if (isActiveStatus(input.status)) {
    return fail(
      "ACTIVE_CREATE_REJECTED",
      "ACTIVE status is not allowed on create — sales lock and Product SoT remain closed"
    );
  }

  const dryRun = context.dryRun === true;
  const explicit = context.requireExplicitAuth === true;
  const inherited =
    Boolean(context.actorId) &&
    ["ADMIN", "IMPORT", "SYSTEM", "TEST"].includes(String(context.source || "").toUpperCase());
  const authorized = context.authorized === true || (!explicit && inherited);

  if (!dryRun && !authorized) {
    return fail("UNAUTHORIZED", "Admin authorization required for product writes", 403);
  }

  if (Array.isArray(input.offers) && input.offers.length) {
    const conflict = resolveSupplierConflict(input.offers);
    if (conflict.failClosed) {
      return fail("CONFLICTING_SUPPLIER_OFFERS", "Conflicting supplier stock is not auto-resolved", 409, {
        conflict,
      });
    }
  }

  return {
    ok: true,
    persist: !dryRun,
    dualWrite: false,
    written: false,
    productSourceOfTruthActive: isProductSourceOfTruthActive(),
    salesEnabled: isSalesEnabled(),
    purchaseOwnStock: false,
    boundary: BOUNDARY_ID,
    destination: context.destination || null,
    reason: dryRun ? "DRY_RUN" : "AUTHORIZED_DRAFT",
    normalizedStatus: input.status || null,
    sku,
  };
}

module.exports = {
  BOUNDARY_ID,
  isProductSourceOfTruthActive,
  isActiveStatus,
  authorizeCreate,
};
