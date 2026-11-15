/**
 * Compatibility layer between Native 17-agent IDs and pusat/council.js MEMBERS.
 * Does not rewrite SEED_IDS. Does not merge dual-registry records or memory.
 */
const NATIVE_SEED_IDS = Object.freeze([
  "pusat",
  "sinan_bey",
  "esat_bey",
  "dogu_bey",
  "nedim_bey",
  "tuncay_bey",
  "amelia",
  "adrian",
  "mira",
  "leon",
  "stock_ai",
  "category_ai",
  "pricing_ai",
  "seo_ai",
  "banu_hanim",
  "sales_analysis_ai",
  "zeynep_hanim",
]);

const OFFICIAL_DISPLAY_NAMES = Object.freeze({
  pusat: "Pusat",
  sinan_bey: "Sinan Bey",
  esat_bey: "Esat Bey",
  dogu_bey: "Doğu Bey",
  nedim_bey: "Nedim Bey",
  tuncay_bey: "Tuncay Bey",
  amelia: "Amelia",
  adrian: "Adrian",
  mira: "Mira",
  leon: "Leon",
  stock_ai: "Çakır Bey",
  category_ai: "Pelin Hanım",
  pricing_ai: "Akın Bey",
  seo_ai: "Yılmaz Bey",
  banu_hanim: "Banu Hanım",
  sales_analysis_ai: "Sencer Bey",
  zeynep_hanim: "Zeynep Hanım",
});

/** Legacy MEMBERS ids that route to a native seed without merging records. */
const LEGACY_ALIAS_TO_NATIVE = Object.freeze({
  customs_ai: "tuncay_bey",
  phone_ai: "zeynep_hanim",
  price_ai: "pricing_ai",
  customer_ai: "banu_hanim",
});

/** Same-string ids that exist in both registries (not aliases). */
const SHARED_STRING_IDS = Object.freeze(["pusat", "sinan_bey", "esat_bey", "dogu_bey", "stock_ai", "seo_ai", "sales_analysis_ai"]);

/** MEMBERS ids that are not the 17-agent seed and are not aliases. Not auto-mapped. */
const MEMBERS_ONLY_IDS = Object.freeze([
  "nesrin_hanim",
  "textile_ai",
  "automotive_ai",
  "construction_ai",
  "agriculture_ai",
  "electronics_ai",
  "legal_ai",
  "finance_ai",
  "logistics_ai",
  "marketing_ai",
]);

const GENERIC_LABELS_FORBIDDEN_IN_UI = Object.freeze([
  "Stok AI",
  "Kategori AI",
  "Fiyatlandırma AI",
  "SEO AI",
  "Satış Analiz AI",
  "Stock Assistant",
  "SEO Assistant",
  "Sales Analysis Assistant",
  "Price Assistant",
  "Customer Assistant",
  "Phone AI",
  "Customs AI",
]);

function officialDisplayName(nativeId) {
  return OFFICIAL_DISPLAY_NAMES[nativeId] || null;
}

function aliasesForNative(nativeId) {
  return Object.entries(LEGACY_ALIAS_TO_NATIVE)
    .filter(([, n]) => n === nativeId)
    .map(([alias]) => alias);
}

function resolveIdentity(id) {
  const requestedId = String(id || "").trim();
  if (!requestedId) {
    return { ok: false, code: "UNKNOWN_IDENTITY", requestedId, identitiesMerged: false };
  }
  if (NATIVE_SEED_IDS.includes(requestedId)) {
    return {
      ok: true,
      kind: "NATIVE",
      requestedId,
      nativeId: requestedId,
      displayName: OFFICIAL_DISPLAY_NAMES[requestedId],
      memoryOwnerId: requestedId,
      permissionProfileId: requestedId,
      identitiesMerged: false,
      liveVerified: false,
    };
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_ALIAS_TO_NATIVE, requestedId)) {
    const nativeId = LEGACY_ALIAS_TO_NATIVE[requestedId];
    return {
      ok: true,
      kind: "LEGACY_ALIAS",
      requestedId,
      nativeId,
      displayName: OFFICIAL_DISPLAY_NAMES[nativeId],
      memoryOwnerId: requestedId,
      permissionProfileId: nativeId,
      identitiesMerged: false,
      note: "alias_routes_without_merging_memory_or_registry_rows",
      liveVerified: false,
    };
  }
  if (MEMBERS_ONLY_IDS.includes(requestedId)) {
    return {
      ok: false,
      code: "NOT_NATIVE_SEED",
      kind: "MEMBERS_ONLY",
      requestedId,
      nativeId: null,
      identitiesMerged: false,
      note: "members_only_ids_are_not_folded_into_the_17_agent_seed",
    };
  }
  return {
    ok: false,
    code: "UNKNOWN_IDENTITY",
    kind: "UNKNOWN",
    requestedId,
    nativeId: null,
    identitiesMerged: false,
  };
}

module.exports = {
  NATIVE_SEED_IDS,
  OFFICIAL_DISPLAY_NAMES,
  LEGACY_ALIAS_TO_NATIVE,
  SHARED_STRING_IDS,
  MEMBERS_ONLY_IDS,
  GENERIC_LABELS_FORBIDDEN_IN_UI,
  officialDisplayName,
  aliasesForNative,
  resolveIdentity,
};
