/**
 * AB-27 national/special days. Preview only. Publish needs approval.
 */
const calendar = require("../../../data/calendar/ab27_national_days.v1.json");
const euCelebrations = require("../../../data/calendar/eu27_country_celebrations.v1.json");
const extendedCelebrations = require("../../../data/calendar/extended_markets_celebrations.v1.json");
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

const schedules = new Map();

function openSchedule({ country, copy } = {}) {
  const code = String(country || "").toUpperCase();
  const day = listDays(code)[0];
  if (!day) return { ok: false, code: "NO_SOURCED_DAY", published: false };
  const id = `hol_${code}_${schedules.size + 1}`;
  const draft = {
    id,
    country: code,
    day,
    copy: String(copy || day.name).slice(0, 120),
    status: "preview",
    published: false,
    copyrightChecked: false,
  };
  schedules.set(id, draft);
  return { ok: true, draft };
}

function editSchedule(id, copy) {
  const draft = schedules.get(id);
  if (!draft || draft.status === "closed") return { ok: false, code: "NOT_EDITABLE", published: false };
  draft.copy = String(copy || "").slice(0, 120);
  draft.status = "edited";
  draft.published = false;
  return { ok: true, draft: { ...draft } };
}

function closeSchedule(id) {
  const draft = schedules.get(id);
  if (!draft) return { ok: false, code: "NOT_FOUND", published: false };
  draft.status = "closed";
  draft.published = false;
  return { ok: true, draft: { ...draft }, published: false };
}

function previewPack({ country, today = "2026-11-01" } = {}) {
  const preview = previewBanner({ country, today });
  return {
    ...preview,
    banner: preview.hit ? { title: preview.hit.name, locale: preview.hit.locale || null } : null,
    video: { licensed: false, published: false },
    culturalReview: false,
    productionPublish: false,
  };
}

function listCelebrations(country) {
  const code = String(country || "").toUpperCase();
  const national = calendar.days.filter((day) => day.country === code);
  const cultural = (euCelebrations.celebrations || []).filter((day) => day.country === code);
  const extended = (extendedCelebrations.celebrations || []).filter((day) => day.country === code);
  return { national, cultural, extended };
}

function matchToday({ country, today = "2026-11-18" } = {}) {
  const mmdd = String(today).slice(5);
  const groups = listCelebrations(country);
  const hitNational = groups.national.find((d) => d.date === mmdd) || null;
  const hitCultural = groups.cultural.find((d) => d.mmdd === mmdd) || null;
  const hitExtended = groups.extended.find((d) => d.mmdd === mmdd) || null;
  return {
    country,
    today,
    hitNational,
    hitCultural,
    hitExtended,
    anyHit: Boolean(hitNational || hitCultural || hitExtended),
    published: false,
  };
}

function coverage() {
  const covered = new Set(calendar.days.map((d) => d.country));
  const culturalCovered = new Set((euCelebrations.celebrations || []).map((d) => d.country));
  const extendedCovered = new Set((extendedCelebrations.celebrations || []).map((d) => d.country));
  return {
    ab27: AB27.length,
    sourcedCountries: covered.size,
    culturalCountries: culturalCovered.size,
    extendedMarkets: extendedCelebrations.markets || [],
    extendedCountries: extendedCovered.size,
    softwareCoverageReady: covered.size === AB27.length && culturalCovered.size === AB27.length,
    completeClaim: false,
    liveVerified: false,
    missingCountries: AB27.filter((code) => !covered.has(code)),
    missingCultural: AB27.filter((code) => !culturalCovered.has(code)),
    sourceNote: calendar.note,
    celebrationNote: euCelebrations.note,
  };
}

module.exports = {
  listDays,
  listCelebrations,
  matchToday,
  previewBanner,
  previewPack,
  publishBanner,
  openSchedule,
  editSchedule,
  closeSchedule,
  coverage,
};
