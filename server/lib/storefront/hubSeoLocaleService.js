/**
 * Per-hub SEO + locale coverage for the 50 active L1 categories.
 */
const fs = require("fs");
const path = require("path");
const categoryCatalog = require("./categoryCatalog");
const supportedLocales = require("../../../lib/i18n/supported-locales.json");

const MANIFEST = path.join(__dirname, "..", "..", "..", "data", "taxonomy", "hub_seo_l1_labels.v1.json");
const REVIEWED_LABELS = path.join(__dirname, "..", "..", "..", "lib", "categories", "translations", "catalog-locale.json");
const { listActiveL2 } = require("../pim/subcategoryCatalogProfile");
const PRIMARY = Object.freeze(["de", "en", "tr", "ar"]);

let reviewedLabels = null;

function loadReviewedLabels() {
  if (reviewedLabels) return reviewedLabels;
  reviewedLabels = JSON.parse(fs.readFileSync(REVIEWED_LABELS, "utf8"));
  return reviewedLabels;
}

function reviewedLabel(categoryId, locale) {
  const pack = loadReviewedLabels();
  const own = pack.mains?.[categoryId]?.[locale] || pack.textile?.[categoryId]?.[locale];
  if (own && String(own).trim()) return { label: String(own).trim(), reviewed: true, fallbackFrom: null };
  return { label: null, reviewed: false, fallbackFrom: "source" };
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

function buildHubSeoMeta(hubId, locale = "de") {
  const doc = loadManifest();
  const hub = doc.hubs.find((row) => row.id === hubId);
  const cat = categoryCatalog.getCategoryById(hubId);
  if (!hub || !cat) return { ok: false, code: "HUB_UNKNOWN" };
  const own = hub.labels[locale] && String(hub.labels[locale]).trim();
  const catalogLabel = reviewedLabel(hubId, locale);
  const reviewed = Boolean(own) || catalogLabel.reviewed;
  const label = own || catalogLabel.label || hub.labels.de || hub.labels.en || cat.name;
  const fallbackFrom = reviewed ? null : hub.labels.de ? "de" : "source";
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
  const canonical = `${site}${cat.url || `/kategorie/${cat.slug}/`}`;
  return {
    ok: true,
    hubId,
    locale,
    title: `${label} — Buzzard`,
    metaDescription: `${label}: Produkte im Buzzard-Katalog (Vorschau, kein Live-Verkauf).`,
    canonical,
    hreflangLocales: supportedLocales,
    robots: process.env.BUZZARD_SALES_ENABLED === "1" ? "index,follow" : "index,follow",
    livePublish: false,
    inventedClaims: false,
    reviewed,
    fallbackFrom,
  };
}

function validateHubSeoCoverage() {
  const doc = loadManifest();
  const hubs = doc.hubs || [];
  const missingPrimary = [];
  for (const hub of hubs) {
    for (const loc of PRIMARY) {
      if (!hub.labels[loc] || !String(hub.labels[loc]).trim()) missingPrimary.push({ id: hub.id, locale: loc });
    }
  }
  const fallbackLocales = supportedLocales.filter((loc) => !PRIMARY.includes(loc));
  return {
    ok: missingPrimary.length === 0 && hubs.length === 50,
    activeHubs: hubs.length,
    primaryLocales: PRIMARY.length,
    fallbackLocales: fallbackLocales.length,
    missingPrimary,
    completeClaim: false,
    note: "Fallback locales use manifest default names until translated.",
  };
}

function resolveHubLabel(hubId, locale) {
  const doc = loadManifest();
  const hub = doc.hubs.find((row) => row.id === hubId);
  const cat = categoryCatalog.getCategoryById(hubId);
  if (!hub) return cat?.name || "";
  return (
    hub.labels[locale] ||
    hub.labels.de ||
    hub.labels.en ||
    cat?.name ||
  "");
}

function validateExtendedLocaleFallback() {
  const doc = loadManifest();
  const gaps = [];
  for (const hub of doc.hubs || []) {
    for (const locale of supportedLocales) {
      const label = resolveHubLabel(hub.id, locale);
      if (!String(label).trim()) gaps.push({ id: hub.id, locale });
    }
  }
  return {
    ok: gaps.length === 0,
    locales: supportedLocales.length,
    hubs: (doc.hubs || []).length,
    gaps: gaps.slice(0, 20),
    inventedLegalText: false,
    note: "Fallback chain de→en→category name; no marketing claims invented.",
  };
}

function buildL2SeoMeta(categoryId, locale = "de") {
  const cat = categoryCatalog.getCategoryById(categoryId);
  if (!cat) return { ok: false, code: "L2_UNKNOWN", categoryId, locale };
  const hit = reviewedLabel(categoryId, locale);
  const sourceName = cat.name;
  const reviewed = hit.reviewed || (locale === "de" && Boolean(sourceName));
  const label = hit.reviewed ? hit.label : sourceName;
  return {
    ok: true,
    categoryId,
    locale,
    title: `${label} — Buzzard`,
    label,
    reviewed,
    fallbackFrom: reviewed ? null : "source",
    livePublish: false,
    professionalCopy: false,
  };
}

function auditL2ReviewedCopy(locales = supportedLocales) {
  const rows = listActiveL2();
  let reviewedAllLocales = 0;
  const missing = [];
  for (const row of rows) {
    const gaps = locales.filter((locale) => !reviewedLabel(row.id, locale).reviewed && locale !== "de");
    if (gaps.length === 0) reviewedAllLocales += 1;
    else missing.push({ id: row.id, locales: gaps.length });
  }
  return {
    l2Count: rows.length,
    reviewedAllLocales,
    missingReviewedLocales: missing.length,
    sampleMissing: missing.slice(0, 5),
    professionalCopy: false,
    completeClaim: false,
  };
}

function listHubSeoBatch(locales = PRIMARY) {
  const doc = loadManifest();
  return (doc.hubs || []).map((hub) =>
    Object.fromEntries(locales.map((loc) => [loc, buildHubSeoMeta(hub.id, loc)]))
  );
}

module.exports = {
  buildHubSeoMeta,
  buildL2SeoMeta,
  auditL2ReviewedCopy,
  reviewedLabel,
  validateHubSeoCoverage,
  validateExtendedLocaleFallback,
  resolveHubLabel,
  listHubSeoBatch,
  PRIMARY,
};