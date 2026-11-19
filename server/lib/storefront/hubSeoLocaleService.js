/**
 * Per-hub SEO + locale coverage for the 50 active L1 categories.
 */
const fs = require("fs");
const path = require("path");
const categoryCatalog = require("./categoryCatalog");
const supportedLocales = require("../../../lib/i18n/supported-locales.json");

const MANIFEST = path.join(__dirname, "..", "..", "..", "data", "taxonomy", "hub_seo_l1_labels.v1.json");
const PRIMARY = Object.freeze(["de", "en", "tr", "ar"]);

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

function buildHubSeoMeta(hubId, locale = "de") {
  const doc = loadManifest();
  const hub = doc.hubs.find((row) => row.id === hubId);
  const cat = categoryCatalog.getCategoryById(hubId);
  if (!hub || !cat) return { ok: false, code: "HUB_UNKNOWN" };
  const label = hub.labels[locale] || hub.labels.de || cat.name;
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

function listHubSeoBatch(locales = PRIMARY) {
  const doc = loadManifest();
  return (doc.hubs || []).map((hub) =>
    Object.fromEntries(locales.map((loc) => [loc, buildHubSeoMeta(hub.id, loc)]))
  );
}

module.exports = {
  buildHubSeoMeta,
  validateHubSeoCoverage,
  validateExtendedLocaleFallback,
  resolveHubLabel,
  listHubSeoBatch,
  PRIMARY,
};