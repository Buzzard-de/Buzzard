const { check } = require("../permissionEngine");
const LOCALES = require("../../../../../lib/i18n/supported-locales.json");

const BANNED_CLAIM = /(cerberus|iso\s*9001|lifetime warranty|%100 orijinal)/i;

function checkSchema(node) {
  if (!node || typeof node !== "object") {
    return { status: "MISSING_STRUCTURED_DATA", ok: false, live: false, missing: ["@context", "@type", "name", "sku"], salesPriceBlocked: false };
  }
  const missing = [];
  if (node["@context"] !== "https://schema.org") missing.push("@context");
  if (node["@type"] !== "Product") missing.push("@type");
  if (!node.name) missing.push("name");
  if (!node.sku) missing.push("sku");
  const salesOn = process.env.BUZZARD_SALES_ENABLED === "1";
  const pricePresent = Boolean(node.offers && node.offers.price != null);
  if (!salesOn && pricePresent) {
    return { status: "SALES_PRICE_BLOCKED", ok: false, live: false, missing, salesPriceBlocked: true };
  }
  return {
    status: missing.length ? "INCOMPLETE" : "CHECKED_LOCAL",
    ok: missing.length === 0,
    live: false,
    missing,
    salesPriceBlocked: false,
  };
}

function draft({ actorId = "seo_ai", titleFacts = [], lang = "de", existing = [], structuredData = null } = {}) {
  if (!check(actorId, "SEO_DRAFT").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const facts = titleFacts.filter((t) => t && !BANNED_CLAIM.test(t));
  const invented = titleFacts.filter((t) => BANNED_CLAIM.test(t));
  const title = facts.slice(0, 8).join(" ").slice(0, 70);
  const meta = facts.join(". ").slice(0, 155);
  const dup = existing.includes(title);
  return {
    ok: true,
    lang,
    localeKnown: LOCALES.includes(lang),
    localeCount: LOCALES.length,
    title,
    metaDescription: meta,
    keywords: facts.slice(0, 5),
    inventedClaimsRejected: invented,
    duplicate: dup,
    livePublish: false,
    schemaCheck: checkSchema(structuredData),
  };
}

function inventClaim() {
  return { ok: false, code: "SEO_INVENTED_CLAIM_DENIED" };
}

function livePublish() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "SEO_LIVE_PUBLISH" };
}

module.exports = { draft, inventClaim, livePublish, checkSchema, LOCALES };
