/**
 * Part 22 — Deterministic attribute quality evaluation.
 */
const { buildBlockReason, PLACEHOLDER_PATTERNS } = require("../../core/productQualityHardeningConstants");
const { normalizeUnit } = require("./unitNormalizer");

function isPlaceholderValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(text));
}

function evaluateAttributeQuality(record, options = {}) {
  const findings = [];
  const attributes = Array.isArray(record.attributes)
    ? record.attributes
    : record.attributes && typeof record.attributes === "object"
      ? Object.entries(record.attributes).map(([name, value]) =>
          typeof value === "object" ? { name, ...value } : { name, value }
        )
      : [];

  const required = options.requiredAttributes || [];
  const seen = new Map();

  for (const attr of attributes) {
    const name = String(attr.name || attr.key || "").trim();
    const value = attr.value ?? attr.val ?? "";
    const unit = attr.unit;

    if (!name) {
      findings.push(buildBlockReason("ATTRIBUTE_INVALID", "attributes", "Attribute without name detected."));
      continue;
    }

    if (seen.has(name.toLowerCase())) {
      findings.push(
        buildBlockReason("ATTRIBUTE_DUPLICATE", `attributes.${name}`, `Duplicate attribute: ${name}.`)
      );
    }
    seen.set(name.toLowerCase(), true);

    if (value === null || value === undefined || String(value).trim() === "") {
      findings.push(buildBlockReason("ATTRIBUTE_EMPTY", `attributes.${name}`, `Attribute ${name} is empty.`));
    } else if (isPlaceholderValue(value)) {
      findings.push(
        buildBlockReason("ATTRIBUTE_INVALID", `attributes.${name}`, `Attribute ${name} has placeholder value.`)
      );
    }

    if (unit) {
      const unitResult = normalizeUnit(unit, { fieldImportance: options.criticalUnit ? "critical" : "standard" });
      if (!unitResult.ok) {
        findings.push(
          buildBlockReason(
            unitResult.unknown ? "UNIT_UNKNOWN" : "UNIT_AMBIGUOUS",
            `attributes.${name}.unit`,
            unitResult.unknown ? `Unknown unit: ${unit}` : `Ambiguous unit: ${unit}`,
            unitResult.status === "BLOCKED" ? "BLOCKED" : "CONDITION"
          )
        );
      }
    }

    if (attr.type && !["string", "number", "boolean", "enum"].includes(String(attr.type))) {
      findings.push(
        buildBlockReason("ATTRIBUTE_INVALID", `attributes.${name}.type`, `Invalid attribute type: ${attr.type}.`)
      );
    }
  }

  for (const req of required) {
    if (!seen.has(String(req).toLowerCase())) {
      findings.push(
        buildBlockReason("ATTRIBUTE_MISSING", `attributes.${req}`, `Required attribute missing: ${req}.`)
      );
    }
  }

  const blocked = findings.some((f) => f.severity === "BLOCKED");
  const condition = findings.some((f) => f.severity === "CONDITION");
  const passCount = attributes.length - findings.filter((f) => f.severity === "BLOCKED").length;
  const score =
    attributes.length === 0 && required.length === 0
      ? 100
      : Math.max(0, Math.round((passCount / Math.max(attributes.length, required.length, 1)) * 100));

  return {
    status: blocked ? "BLOCKED" : condition ? "CONDITION" : "PASS",
    score,
    findings,
    attributeCount: attributes.length,
  };
}

module.exports = {
  evaluateAttributeQuality,
};
