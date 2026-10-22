/**
 * Search-year acceptance only. Does not imply catalog coverage or fitment.
 * Rule: integer years from MIN (1960) through current UTC year + 1 (next model year).
 */

const MIN_SEARCH_YEAR = 1960;

function maxSearchYear(now = new Date()) {
  return now.getUTCFullYear() + 1;
}

function validateSearchYear(value, now = new Date()) {
  if (value == null || value === "") {
    return { ok: true, present: false, year: undefined };
  }
  const raw = String(value).trim();
  if (!/^-?\d+$/.test(raw)) {
    return { ok: false, present: true, error: "invalid_year", min: MIN_SEARCH_YEAR, max: maxSearchYear(now) };
  }
  const year = Number(raw);
  if (!Number.isInteger(year)) {
    return { ok: false, present: true, error: "invalid_year", min: MIN_SEARCH_YEAR, max: maxSearchYear(now) };
  }
  if (year < MIN_SEARCH_YEAR) {
    return {
      ok: false,
      present: true,
      year,
      error: "year_below_minimum",
      min: MIN_SEARCH_YEAR,
      max: maxSearchYear(now),
    };
  }
  const max = maxSearchYear(now);
  if (year > max) {
    return { ok: false, present: true, year, error: "year_in_future", min: MIN_SEARCH_YEAR, max };
  }
  return { ok: true, present: true, year, min: MIN_SEARCH_YEAR, max };
}

function invalidYearSearchResult(checked) {
  return {
    items: [],
    total: 0,
    invalidYear: true,
    error: checked.error,
    minSearchYear: checked.min,
    maxSearchYear: checked.max,
    yearAccepted: false,
    catalogCoverageClaimed: false,
    compatibilityInferredFromYear: false,
  };
}

function invalidYearCompatibility(checked) {
  return {
    state: "INSUFFICIENT_DATA",
    explanation: "Requested model year is outside the accepted search range.",
    rulesApplied: ["search_year_validation"],
    missingInformation: [checked.error || "invalid_year"],
    invalidYear: true,
    yearAccepted: false,
    catalogCoverageClaimed: false,
    compatibilityInferredFromYear: false,
    aiSoleAuthority: false,
  };
}

module.exports = {
  MIN_SEARCH_YEAR,
  maxSearchYear,
  validateSearchYear,
  invalidYearSearchResult,
  invalidYearCompatibility,
};
