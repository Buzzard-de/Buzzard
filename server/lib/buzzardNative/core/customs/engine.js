const { AB27 } = require("../../../commerce/ab27Tax");
const { check } = require("../permissionEngine");
const { list } = require("./sourceRegistry");

const CATALOG = Object.freeze({
  cotton_tshirt: { hs: "6109.10", cn: "61091000", taric: "6109100010", confidence: 0.62, dualUse: false },
  brake_pad: { hs: "8708.30", cn: "87083091", taric: "8708309190", confidence: 0.48, dualUse: false },
  encryption_module: { hs: "8473.30", cn: null, taric: null, confidence: 0.3, dualUse: true },
});

const SANCTION_SEED = Object.freeze({
  countries: ["KP"],
  entities: [],
  live: false,
  note: "Schema seed. Not a live UN/EU feed.",
});

function classify({ actorId = "tuncay_bey", sku, description } = {}) {
  if (!check(actorId, "CUSTOMS_CLASSIFY").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const key = sku || description;
  const hit = CATALOG[key];
  if (!hit) {
    return {
      ok: true,
      status: "UNKNOWN",
      definitive: false,
      legalClassification: false,
      referHuman: true,
      liveTaric: false,
    };
  }
  const status = hit.confidence >= 0.8 ? "CLEAR" : "REVIEW_REQUIRED";
  return {
    ok: true,
    ...hit,
    status,
    definitive: false,
    legalClassification: false,
    referHuman: status !== "CLEAR",
    liveTaric: false,
    sources: list(),
  };
}

function duty({ actorId = "tuncay_bey", goodsValue, origin, destination, freight = 0, insurance = 0, hs } = {}) {
  if (!check(actorId, "CUSTOMS_CALCULATE").ok) return { ok: false, code: "PERMISSION_DENIED" };
  if (goodsValue == null || !origin || !destination || !hs) {
    return { ok: false, code: "MISSING_INPUT", status: "UNKNOWN", definitive: false };
  }
  const customsValue = Number(goodsValue) + Number(freight) + Number(insurance);
  return {
    ok: true,
    customsValue,
    duty: null,
    importVat: null,
    status: "REVIEW_REQUIRED",
    definitive: false,
    note: "Duty/VAT rates not live TARIC. Missing rate → not asserted.",
    liveLegal: false,
  };
}

function screen({
  actorId = "tuncay_bey",
  sku,
  origin,
  sellerCountry,
  customerCountry,
  transit = [],
  destination,
  endUser,
  buyer,
} = {}) {
  if (!check(actorId, "CUSTOMS_SCREEN").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const cls = classify({ actorId, sku });
  const countries = [origin, sellerCountry, customerCountry, destination, ...(transit || [])].filter(Boolean);
  const sanctioned = countries.some((c) => SANCTION_SEED.countries.includes(String(c).toUpperCase()));
  const missingOrigin = !origin;
  const missingHs = cls.status === "UNKNOWN";
  const dualUse = cls.dualUse === true;
  let status = "REVIEW_REQUIRED";
  if (sanctioned) status = "BLOCKED";
  else if (missingOrigin || missingHs) status = "UNKNOWN";
  else if (cls.status === "UNKNOWN") status = "UNKNOWN";
  if (status === "UNKNOWN" || status === "BLOCKED") {
    /* never auto-clear */
  }
  return {
    ok: true,
    steps: [
      "define_product",
      "hs_cn_taric",
      "origin",
      "seller_country",
      "customer_country",
      "transit",
      "destination",
      "buyer_end_user",
      "sanctions",
    ],
    classification: cls,
    origin,
    sellerCountry,
    customerCountry,
    transit,
    destination,
    buyer,
    endUser,
    dualUse,
    sanctioned,
    status,
    autoClear: false,
    liveSanctions: false,
    inAb27Dest: AB27.includes(String(destination || "").toUpperCase()) || destination === "GR",
    humanReview: status !== "CLEAR",
    liveLegal: false,
  };
}

function hold({ actorId = "tuncay_bey", reason } = {}) {
  if (!check(actorId, "CUSTOMS_HOLD").ok) return { ok: false, code: "PERMISSION_DENIED" };
  return { ok: true, held: true, released: false, reason };
}

function release() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "CUSTOMS_RELEASE" };
}

function fileDeclaration() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "CUSTOMS_FILE_DECLARATION" };
}

function draftDocuments({ actorId = "tuncay_bey", kind = "commercial_invoice" } = {}) {
  if (!check(actorId, "CUSTOMS_DOCUMENT_DRAFT").ok) return { ok: false, code: "PERMISSION_DENIED" };
  return { ok: true, kind, draft: true, filed: false, liveLegal: false };
}

module.exports = { classify, duty, screen, hold, release, fileDeclaration, draftDocuments, CATALOG, SANCTION_SEED };
