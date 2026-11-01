/**
 * AB-27 national/special days. Preview only. Publish needs approval.
 */
const calendar = require("../../../data/calendar/ab27_national_days.v1.json");
const { AB27 } = require("../commerce/ab27Tax");

function listDays(country) {
  const code = String(country || "").toUpperCase();
  return calendar.days.filter((day) => day.country === code);
}

function previewBanner({ country, today = "2026-11-01" } = {}) {
  const mmdd = String(today).slice(5);
  const hit = listDays(country).find((day) => day.date === mmdd);
  return {
    country,
    hit: hit || null,
    published: false,
    copyrightChecked: false,
    acceptanceStatus: "COMMAND_GIVEN",
  };
}

function publishBanner() {
  return {
    ok: false,
    code: "NEEDS_APPROVAL",
    published: false,
    note: "Homepage publish is blocked until the operator approves copy and copyright.",
  };
}

function coverage() {
  const covered = new Set(calendar.days.map((d) => d.country));
  return {
    ab27: AB27.length,
    sourcedCountries: covered.size,
    completeClaim: false,
    missingCountries: AB27.filter((code) => !covered.has(code)),
    sourceNote: calendar.note,
  };
}

module.exports = { listDays, previewBanner, publishBanner, coverage };
