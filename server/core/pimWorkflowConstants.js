/**
 * PIM workflow labels — maps existing Product Core + staging states to review lifecycle.
 * APPROVED does NOT imply PUBLISHED; publish remains a separate human-controlled step.
 */
const { PRODUCT_STATUS } = require("./productConstants");
const { STAGING_LIFECYCLE } = require("./productLifecycleConstants");
const { STOREFRONT_VISIBILITY } = require("./storefrontConstants");

const PIM_WORKFLOW_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  IMPORTED: "IMPORTED",
  NORMALIZED: "NORMALIZED",
  VALIDATED: "VALIDATED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  APPROVED: "APPROVED",
  PUBLISH_BLOCKED: "PUBLISH_BLOCKED",
  PUBLISHED: "PUBLISHED",
  INVALID: "INVALID",
});

const ADMIN_WORKFLOW_FILTERS = Object.freeze([
  "ALL",
  PIM_WORKFLOW_STATUS.DRAFT,
  PIM_WORKFLOW_STATUS.INVALID,
  PIM_WORKFLOW_STATUS.REVIEW_REQUIRED,
  PIM_WORKFLOW_STATUS.READY_FOR_REVIEW,
  PIM_WORKFLOW_STATUS.APPROVED,
  PIM_WORKFLOW_STATUS.PUBLISH_BLOCKED,
]);

function resolveStagingWorkflowStatus(stagingRecord) {
  if (!stagingRecord) return null;
  const status = stagingRecord.lifecycleStatus || stagingRecord.lifecycle_status;
  switch (status) {
    case STAGING_LIFECYCLE.DISCOVERED:
    case STAGING_LIFECYCLE.IMPORTED:
      return PIM_WORKFLOW_STATUS.IMPORTED;
    case STAGING_LIFECYCLE.VALIDATION_PENDING:
      return PIM_WORKFLOW_STATUS.NORMALIZED;
    case STAGING_LIFECYCLE.VALIDATED:
      return PIM_WORKFLOW_STATUS.READY_FOR_REVIEW;
    case STAGING_LIFECYCLE.BLOCKED:
      return PIM_WORKFLOW_STATUS.REVIEW_REQUIRED;
    case STAGING_LIFECYCLE.INVALID:
      return PIM_WORKFLOW_STATUS.INVALID;
    case STAGING_LIFECYCLE.REJECTED:
      return PIM_WORKFLOW_STATUS.PUBLISH_BLOCKED;
    case STAGING_LIFECYCLE.PROMOTED:
      return PIM_WORKFLOW_STATUS.IMPORTED;
    default:
      return PIM_WORKFLOW_STATUS.DRAFT;
  }
}

function resolveProductWorkflowStatus(product, { validationOverall } = {}) {
  if (!product) return PIM_WORKFLOW_STATUS.DRAFT;

  const approved = Boolean(product.metadata?.adminApproved || product.metadata?.approved);
  const visibility = product.visibility || STOREFRONT_VISIBILITY.HIDDEN;
  const status = product.status || PRODUCT_STATUS.DRAFT;

  if (visibility === STOREFRONT_VISIBILITY.PUBLIC || visibility === STOREFRONT_VISIBILITY.CATALOG) {
    if ([PRODUCT_STATUS.READY, PRODUCT_STATUS.ACTIVE].includes(status)) {
      return PIM_WORKFLOW_STATUS.PUBLISHED;
    }
  }

  if (status === PRODUCT_STATUS.BLOCKED || status === PRODUCT_STATUS.ARCHIVED) {
    return PIM_WORKFLOW_STATUS.PUBLISH_BLOCKED;
  }

  if (status === PRODUCT_STATUS.DRAFT) return PIM_WORKFLOW_STATUS.DRAFT;
  if (status === PRODUCT_STATUS.IMPORTED) return PIM_WORKFLOW_STATUS.IMPORTED;
  if (status === PRODUCT_STATUS.VALIDATING) return PIM_WORKFLOW_STATUS.NORMALIZED;

  if (status === PRODUCT_STATUS.READY) {
    if (validationOverall === "FAIL") return PIM_WORKFLOW_STATUS.INVALID;
    if (validationOverall === "WARNING") return PIM_WORKFLOW_STATUS.REVIEW_REQUIRED;
    if (approved) return PIM_WORKFLOW_STATUS.APPROVED;
    return PIM_WORKFLOW_STATUS.READY_FOR_REVIEW;
  }

  if (status === PRODUCT_STATUS.HIDDEN) return PIM_WORKFLOW_STATUS.APPROVED;
  if (status === PRODUCT_STATUS.ACTIVE) return PIM_WORKFLOW_STATUS.PUBLISH_BLOCKED;

  return PIM_WORKFLOW_STATUS.DRAFT;
}

module.exports = {
  PIM_WORKFLOW_STATUS,
  ADMIN_WORKFLOW_FILTERS,
  resolveStagingWorkflowStatus,
  resolveProductWorkflowStatus,
};
