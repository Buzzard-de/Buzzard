/** Part 6 — Product Core constants (category-agnostic) */

const PRODUCT_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  IMPORTED: "IMPORTED",
  VALIDATING: "VALIDATING",
  READY: "READY",
  ACTIVE: "ACTIVE",
  HIDDEN: "HIDDEN",
  BLOCKED: "BLOCKED",
  ARCHIVED: "ARCHIVED",
});

const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: ["IMPORTED", "VALIDATING", "ARCHIVED"],
  IMPORTED: ["VALIDATING", "DRAFT", "ARCHIVED"],
  VALIDATING: ["READY", "BLOCKED", "DRAFT", "ARCHIVED"],
  READY: ["ACTIVE", "HIDDEN", "BLOCKED", "DRAFT", "ARCHIVED"],
  ACTIVE: ["HIDDEN", "BLOCKED", "ARCHIVED"],
  HIDDEN: ["ACTIVE", "READY", "ARCHIVED"],
  BLOCKED: ["VALIDATING", "DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
});

const VALIDATION_STATUS = Object.freeze({
  PASS: "PASS",
  WARNING: "WARNING",
  FAIL: "FAIL",
});

const AUDIT_SOURCE = Object.freeze({
  ADMIN: "ADMIN",
  SUPPLIER: "SUPPLIER",
  AI: "AI",
  IMPORT: "IMPORT",
  SYSTEM: "SYSTEM",
});

const MEDIA_TYPE = Object.freeze({
  IMAGE: "image",
  VIDEO: "video",
  MANUAL: "manual",
  DATASHEET: "datasheet",
  CERTIFICATE: "certificate",
});

const VARIANT_AXIS = Object.freeze(["size", "color", "capacity", "packSize", "model", "configuration"]);

const QUALITY_DIMENSIONS = Object.freeze([
  "identity",
  "content",
  "media",
  "pricing",
  "stock",
  "category",
  "seo",
  "supplier",
]);

const JOB_TYPES_PIM = Object.freeze({
  PRODUCT_IMPORT: "PRODUCT_IMPORT",
  PRODUCT_VALIDATE: "PRODUCT_VALIDATE",
  PRODUCT_NORMALIZE: "PRODUCT_NORMALIZE",
  PRODUCT_MAPPING: "PRODUCT_MAPPING",
});

const SALES_BLOCKED_STATUSES = new Set([PRODUCT_STATUS.BLOCKED, PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.ARCHIVED]);

function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function canPrepareForSale(status) {
  if (process.env.BUZZARD_SALES_ENABLED === "1") {
    return status === PRODUCT_STATUS.ACTIVE;
  }
  return false;
}

module.exports = {
  PRODUCT_STATUS,
  ALLOWED_TRANSITIONS,
  VALIDATION_STATUS,
  AUDIT_SOURCE,
  MEDIA_TYPE,
  VARIANT_AXIS,
  QUALITY_DIMENSIONS,
  JOB_TYPES_PIM,
  SALES_BLOCKED_STATUSES,
  canTransition,
  canPrepareForSale,
};
