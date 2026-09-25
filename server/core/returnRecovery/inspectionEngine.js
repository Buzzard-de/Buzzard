const { ITEM_CONDITIONS } = require("./constants");

function normalizeInspection(input = {}) {
  const condition = String(input.condition || ITEM_CONDITIONS.UNKNOWN).toUpperCase();
  const resellable =
    input.resellable === true ||
    condition === ITEM_CONDITIONS.RESELLABLE ||
    condition === ITEM_CONDITIONS.NEW ||
    condition === ITEM_CONDITIONS.UNOPENED;

  const notResellable =
    input.resellable === false ||
    condition === ITEM_CONDITIONS.NOT_RESALEABLE ||
    condition === ITEM_CONDITIONS.DAMAGED ||
    condition === ITEM_CONDITIONS.DEFECTIVE;

  let inspectionStatus = "COMPLETED";
  if (input.inspectionStatus === "REVIEW_REQUIRED" || condition === ITEM_CONDITIONS.UNKNOWN) {
    inspectionStatus = "REVIEW_REQUIRED";
  }

  return {
    condition,
    packagingCondition: input.packagingCondition || ITEM_CONDITIONS.UNKNOWN,
    productComplete: input.productComplete !== false,
    serialNumberVerified: Boolean(input.serialNumberVerified),
    accessoriesComplete: input.accessoriesComplete !== false,
    damageFound: Boolean(input.damageFound),
    resellable: notResellable ? false : resellable,
    inspectionNotes: String(input.inspectionNotes || ""),
    inspectedBy: input.inspectedBy || null,
    inspectedAt: input.inspectedAt || new Date().toISOString(),
    inspectionStatus,
  };
}

function validateInspectionRequired(returnCase) {
  if (!returnCase.inspection) {
    return { required: true, ok: false };
  }
  if (returnCase.inspection.inspectionStatus === "REVIEW_REQUIRED") {
    return { required: true, ok: false, reviewRequired: true };
  }
  return { required: true, ok: true };
}

module.exports = { normalizeInspection, validateInspectionRequired };
