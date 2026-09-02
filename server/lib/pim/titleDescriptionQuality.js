/**
 * Part 22 — Title and description quality checks (deterministic).
 */
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");
const { buildBlockReason, PLACEHOLDER_PATTERNS } = require("../../core/productQualityHardeningConstants");

const TITLE_MIN = 3;
const TITLE_MAX = 256;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 50000;

function hasSuspiciousContent(text) {
  const value = String(text || "");
  if (/<script[\s>]/i.test(value)) return true;
  if (/javascript:/i.test(value)) return true;
  if (/on\w+\s*=/i.test(value)) return true;
  return false;
}

function isPlaceholderText(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function evaluateTitleDescriptionQuality(record) {
  const findings = [];
  const title = String(record.title || record.name || "").trim();
  const description = String(record.description || "").trim();

  if (!title) {
    findings.push(buildBlockReason(BLOCKING_CODES.TITLE_MISSING, "title", "Title is required."));
  } else {
    if (title.length < TITLE_MIN) {
      findings.push(buildBlockReason("TITLE_TOO_SHORT", "title", "Title is too short."));
    }
    if (title.length > TITLE_MAX) {
      findings.push(buildBlockReason("TITLE_TOO_LONG", "title", "Title exceeds maximum length."));
    }
    if (isPlaceholderText(title)) {
      findings.push(buildBlockReason("TITLE_PLACEHOLDER", "title", "Title appears to be a placeholder."));
    }
  }

  if (!description) {
    findings.push(
      buildBlockReason("DESCRIPTION_MISSING", "description", "Description is missing.", "CONDITION")
    );
  } else {
    if (description.length < DESCRIPTION_MIN) {
      findings.push(buildBlockReason("DESCRIPTION_TOO_SHORT", "description", "Description is too short.", "CONDITION"));
    }
    if (isPlaceholderText(description)) {
      findings.push(
        buildBlockReason("DESCRIPTION_PLACEHOLDER", "description", "Description appears to be a placeholder.")
      );
    }
    if (hasSuspiciousContent(description)) {
      findings.push(
        buildBlockReason("DESCRIPTION_INVALID", "description", "Description contains invalid HTML/script content.")
      );
    }
    const uniqueWords = new Set(description.toLowerCase().split(/\s+/).filter(Boolean));
    if (uniqueWords.size < 3 && description.length > 20) {
      findings.push(
        buildBlockReason("DESCRIPTION_DUPLICATION", "description", "Description has excessive duplication.", "CONDITION")
      );
    }
  }

  const blocked = findings.some((f) => f.severity === "BLOCKED");
  const condition = findings.some((f) => f.severity === "CONDITION");

  return {
    status: blocked ? "BLOCKED" : condition ? "CONDITION" : "PASS",
    findings,
    titleLength: title.length,
    descriptionLength: description.length,
  };
}

module.exports = {
  evaluateTitleDescriptionQuality,
  isPlaceholderText,
};
