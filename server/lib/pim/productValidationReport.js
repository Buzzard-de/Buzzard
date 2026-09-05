/**
 * Structured product validation report for PIM admin and dry-run tooling.
 */
const { VALIDATION_STATUS } = require("../../core/productConstants");
const productValidation = require("./productValidation");
const { runValidationPipeline } = require("./productValidationPipeline");

function buildStructuredValidationResult(input, options = {}) {
  if (options.pipeline !== false && (input.supplierCode || input.supplier_code || options.supplierCode)) {
    const pipeline = runValidationPipeline(input, options);
    return fromPipelineResult(pipeline);
  }

  const result = productValidation.validateProduct(input);
  return fromFieldValidation(result);
}

function fromFieldValidation(result) {
  const errors = [];
  const warnings = [];
  const missingFields = [];

  for (const row of result.results || []) {
    if (row.status === VALIDATION_STATUS.FAIL) {
      errors.push({ field: row.field, detail: row.detail });
      missingFields.push(row.field);
    } else if (row.status === VALIDATION_STATUS.WARNING) {
      warnings.push({ field: row.field, detail: row.detail });
      if (String(row.detail).includes("missing")) missingFields.push(row.field);
    }
  }

  const valid = result.overall === VALIDATION_STATUS.PASS;
  const status =
    result.overall === VALIDATION_STATUS.FAIL
      ? "REJECTED"
      : result.overall === VALIDATION_STATUS.WARNING
        ? "REVIEW_REQUIRED"
        : "VALIDATED";

  return {
    valid,
    status,
    overall: result.overall,
    errors,
    warnings,
    missingFields: [...new Set(missingFields)],
    failCount: result.failCount,
    warningCount: result.warningCount,
    fields: result.results,
  };
}

function fromPipelineResult(pipeline) {
  const errors = (pipeline.blockingReasons || []).map((code) => ({ field: "pipeline", code }));
  const warnings = [];
  const missingFields = [];

  for (const stage of pipeline.stages || []) {
    if (stage.status === "FAIL" && stage.stage) {
      if (stage.reason) errors.push({ field: stage.stage, detail: stage.reason });
    } else if (stage.status === "WARNING") {
      warnings.push({ field: stage.stage, detail: stage.reason || stage.stage });
    }
  }

  if (pipeline.quality?.blockingReasons?.length) {
    for (const code of pipeline.quality.blockingReasons) {
      if (!errors.some((e) => e.code === code)) errors.push({ field: "quality", code });
    }
  }

  const categoryResolution = pipeline.normalized?.categoryResolution;
  if (categoryResolution && !categoryResolution.ok) {
    missingFields.push("category");
    if (categoryResolution.status === "REVIEW_REQUIRED") {
      warnings.push({ field: "category", detail: categoryResolution.message });
    } else {
      errors.push({ field: "category", code: categoryResolution.code });
    }
  }

  const valid = Boolean(pipeline.ok) && errors.length === 0;
  let status = "REJECTED";
  if (valid) status = "VALIDATED";
  else if (warnings.length && errors.length === 0) status = "REVIEW_REQUIRED";
  else if (pipeline.lifecycleStatus === "INVALID") status = "REJECTED";

  return {
    valid,
    status,
    lifecycleStatus: pipeline.lifecycleStatus,
    errors,
    warnings,
    missingFields: [...new Set(missingFields)],
    score: pipeline.quality?.score ?? null,
    ready: pipeline.quality?.ready ?? false,
    normalized: pipeline.normalized || null,
    stages: pipeline.stages || [],
    blocked: pipeline.blocked,
  };
}

module.exports = {
  buildStructuredValidationResult,
  fromFieldValidation,
  fromPipelineResult,
};
