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

function isActiveFlag(value) {
  if (value === true || value === 1) return true;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "active";
}

function isActiveCreate(input = {}) {
  return isActiveStatus(input.status) || isActiveFlag(input.active);
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

function authorizeCaller(context = {}) {
  const dryRun = context.dryRun === true;
  const explicit = context.requireExplicitAuth === true;
  const inherited =
    Boolean(context.actorId) &&
    ["ADMIN", "IMPORT", "SYSTEM", "TEST"].includes(String(context.source || "").toUpperCase());
  const authorized = context.authorized === true || (!explicit && inherited);
  if (!dryRun && !authorized) {
    return fail("UNAUTHORIZED", "Admin authorization required for product writes", 403);
  }
  return null;
}

function authorizeOffers(input = {}) {
  if (Array.isArray(input.offers) && input.offers.length) {
    const conflict = resolveSupplierConflict(input.offers);
    if (conflict.failClosed) {
      return fail("CONFLICTING_SUPPLIER_OFFERS", "Conflicting supplier stock is not auto-resolved", 409, {
        conflict,
      });
    }
  }
  return null;
}

function authorizeCreate(input = {}, context = {}) {
  if (context.activateSourceOfTruth === true || input.activateSourceOfTruth === true) {
    return fail("SOT_ACTIVATION_BLOCKED", "Product Source of Truth remains inactive");
  }

  const sku = String(input.sku || "").trim();
  if (!sku) {
    return fail("SKU_REQUIRED", "SKU required");
  }

  if (isActiveCreate(input)) {
    return fail(
      "ACTIVE_CREATE_REJECTED",
      "ACTIVE status is not allowed on create — sales lock and Product SoT remain closed"
    );
  }

  const authFail = authorizeCaller(context);
  if (authFail) return authFail;
  const offerFail = authorizeOffers(input);
  if (offerFail) return offerFail;

  const dryRun = context.dryRun === true;
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

function authorizeUpdate(input = {}, context = {}) {
  if (context.activateSourceOfTruth === true || input.activateSourceOfTruth === true) {
    return fail("SOT_ACTIVATION_BLOCKED", "Product Source of Truth remains inactive");
  }

  const existing = context.existing || {};
  const sku = String(input.sku != null ? input.sku : existing.sku || "").trim();
  if (input.sku !== undefined && !sku) {
    return fail("SKU_REQUIRED", "SKU required");
  }

  const becomingActive = isActiveCreate(input) && !isActiveCreate(existing);
  if (becomingActive && !isSalesEnabled()) {
    return fail(
      "ACTIVE_UPDATE_REJECTED",
      "Sales disabled — ACTIVE status is not allowed while sales are locked and Product SoT remains closed"
    );
  }

  const authFail = authorizeCaller(context);
  if (authFail) return authFail;
  const offerFail = authorizeOffers(input);
  if (offerFail) return offerFail;

  const dryRun = context.dryRun === true;
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
    reason: dryRun ? "DRY_RUN" : "AUTHORIZED_UPDATE",
    normalizedStatus: input.status != null ? input.status : existing.status || null,
    sku: sku || null,
  };
}

function authorizeDelete(input = {}, context = {}) {
  if (context.activateSourceOfTruth === true || input.activateSourceOfTruth === true) {
    return fail("SOT_ACTIVATION_BLOCKED", "Product Source of Truth remains inactive");
  }

  const authFail = authorizeCaller(context);
  if (authFail) return authFail;

  const dryRun = context.dryRun === true;
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
    reason: dryRun ? "DRY_RUN" : "AUTHORIZED_DELETE",
    sku: String(input.sku || context.existing?.sku || "").trim() || null,
  };
}

module.exports = {
  BOUNDARY_ID,
  isProductSourceOfTruthActive,
  isActiveStatus,
  isActiveCreate,
  authorizeCreate,
  authorizeUpdate,
  authorizeDelete,
};
