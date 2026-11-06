/**
 * Legal-entity keys. Do not merge without identifiers.
 */
function legalKey(entity) {
  const iso = entity.hqCountry || entity.country_code || "UNKNOWN";
  const num = entity.companyNumber || entity.company_registration_number;
  if (num && num !== "NOT_PUBLISHED") return `${iso}:${String(num).replace(/\s+/g, "").toUpperCase()}`;
  const vat = entity.VAT_ID || entity.vatId;
  if (vat && vat !== "UNKNOWN") return `${iso}:VAT:${String(vat).replace(/\s+/g, "").toUpperCase()}`;
  return `${iso}:NAME:${String(entity.legalName || entity.legal_entity_name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()}`;
}

function isLikelyNaturalPerson(legalName) {
  const s = String(legalName || "");
  if (/\b(GmbH|AG|S\.A\.|SRL|S\.R\.L\.|B\.V\.|N\.V\.|Ltd|Limited|Oy|AB|A\/S|s\.r\.o\.|sp\. z o\.o\.|d\.o\.o\.|IKE|A\.E\.|E\.P\.E\.|ΜΟΝΟΠΡΟΣΩΠΗ|ΕΠΕ|ΑΕ|ΙΚΕ)\b/i.test(s)) {
    return false;
  }
  if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(s) && s.split(" ").length <= 4) return true;
  if (/[\u0370-\u03FF]/.test(s) && !/(ΙΚΕ|ΑΕ|ΕΠΕ|ΕΕ|Ε\.Ε\.)/.test(s)) return true;
  return false;
}

function classifyLetterVsParcel(entity) {
  const cls = String(entity.class || "");
  if (/ACM_POSTVERVOERDIENST|LETTER_|CORRESPONDENCE/.test(cls)) {
    return { letter_service_verified: "REGISTER_CLASS_ONLY", parcel_service_verified: "UNKNOWN" };
  }
  if (/ACM_PAKKETBEZORGDIENST/.test(cls)) {
    return { letter_service_verified: "UNKNOWN", parcel_service_verified: "REGISTER_CLASS_ONLY" };
  }
  if (entity.class === "NATIONAL_POST_USP") {
    return { letter_service_verified: "USP_DESIGNATED", parcel_service_verified: "UNKNOWN" };
  }
  return { letter_service_verified: "UNKNOWN", parcel_service_verified: "UNKNOWN" };
}

function dedupe(entities) {
  const map = new Map();
  const collisions = [];
  for (const e of entities) {
    const k = legalKey(e);
    if (map.has(k)) collisions.push({ key: k, a: map.get(k).id, b: e.id });
    else map.set(k, e);
  }
  return { unique: map.size, collisions };
}

module.exports = { legalKey, isLikelyNaturalPerson, classifyLetterVsParcel, dedupe };
