/**
 * Part 16 — Product lifecycle orchestration (staging → PIM → catalog → public).
 * Sales activation remains independent from catalog publication.
 */
const { PRODUCT_STATUS } = require("../../core/productConstants");
const { STAGING_LIFECYCLE, PUBLICATION_LADDER, canStagingTransition } = require("../../core/productLifecycleConstants");
const { STOREFRONT_VISIBILITY } = require("../../core/storefrontConstants");
const { isDemoOrTestProduct } = require("./demoProductGuard");
const goLiveApproval = require("../commerce/goLiveApproval");
const { isSalesEnabled } = require("../salesMode");

function resolvePublicationStep(step) {
  return PUBLICATION_LADDER.find((s) => s.step === step) || null;
}

function canPromoteToPim(stagingRecord) {
  if (!stagingRecord) return { ok: false, reason: "missing_record" };
  if (stagingRecord.lifecycle_status !== STAGING_LIFECYCLE.VALIDATED) {
    return { ok: false, reason: "not_validated", status: stagingRecord.lifecycle_status };
  }
  if (isDemoOrTestProduct(stagingRecord.normalized || stagingRecord)) {
    return { ok: false, reason: "demo_product" };
  }
  return { ok: true };
}

function canPublishToCatalog(product) {
  if (!product) return { ok: false, reason: "missing_product" };
  if (isDemoOrTestProduct(product)) return { ok: false, reason: "demo_product" };
  if (![PRODUCT_STATUS.READY, PRODUCT_STATUS.ACTIVE].includes(product.status)) {
    return { ok: false, reason: "status_not_ready", status: product.status };
  }
  return { ok: true };
}

function canPublishToPublic(product) {
  const catalogCheck = canPublishToCatalog(product);
  if (!catalogCheck.ok) return catalogCheck;
  if (product.visibility !== STOREFRONT_VISIBILITY.CATALOG && product.visibility !== STOREFRONT_VISIBILITY.PUBLIC) {
    return { ok: false, reason: "not_in_catalog", visibility: product.visibility };
  }
  return { ok: true };
}

function canActivateSales(product) {
  if (!isSalesEnabled()) return { ok: false, reason: "sales_disabled" };
  if (product?.status !== PRODUCT_STATUS.ACTIVE) return { ok: false, reason: "not_active" };
  if (!goLiveApproval.PRODUCTION_SAFETY_LOCK) {
    return { ok: false, reason: "go_live_lock_inactive" };
  }
  return { ok: true };
}

function getLifecycleSummary() {
  return {
    staging: Object.values(STAGING_LIFECYCLE),
    publicationLadder: PUBLICATION_LADDER.map((s) => s.step),
    salesIndependent: true,
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    salesEnabled: isSalesEnabled(),
    rules: {
      demoNeverPublic: true,
      importDefaultDryRun: true,
      publishManual: true,
      salesOff: !isSalesEnabled(),
    },
  };
}

function transitionStagingStatus(current, next) {
  if (!canStagingTransition(current, next)) {
    return { ok: false, reason: "invalid_transition", from: current, to: next };
  }
  return { ok: true, from: current, to: next };
}

module.exports = {
  resolvePublicationStep,
  canPromoteToPim,
  canPublishToCatalog,
  canPublishToPublic,
  canActivateSales,
  getLifecycleSummary,
  transitionStagingStatus,
};
