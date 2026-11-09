const { estimateVat, getStandardVat } = require("../../../commerce/ab27Tax");
const { getCountry, NET_INCOME_RESERVE_RATE } = require("./countryRegistry");
const { usable } = require("./sourceRegistry");
const { check } = require("../permissionEngine");

function calculateVat({ actorId = "nedim_bey", sellerCountry, customerCountry, deliveryCountry, goodsNet, kind = "B2C", forceExpired = false } = {}) {
  if (!check(actorId, "TAX_CALCULATE").ok) return { ok: false, code: "PERMISSION_DENIED" };
  if (forceExpired) return { ok: false, status: "EXPIRED_SOURCE", definitive: false, blocked: true };
  const src = usable("ec_vat_rates");
  if (!src.ok) return { ...src, definitive: false };
  if (src.status === "UNKNOWN") return { ok: false, status: "UNKNOWN", definitive: false };
  const dest = getCountry(deliveryCountry || customerCountry);
  if (!dest) return { ok: false, code: "VAT_UNKNOWN", status: "UNKNOWN", definitive: false, blocked: true };
  if (dest.verificationStatus === "UNVERIFIED" && goodsNet == null) {
    return { ok: false, code: "MISSING_AMOUNT", status: "UNKNOWN", definitive: false };
  }
  if (goodsNet == null || Number.isNaN(Number(goodsNet))) {
    return { ok: false, code: "MISSING_AMOUNT", status: "UNKNOWN", definitive: false };
  }
  const rate = getStandardVat(dest.iso);
  if (rate == null) return { ok: false, code: "VAT_UNKNOWN", status: "UNKNOWN", definitive: false };
  const est = estimateVat({ country: dest.iso, netAmount: goodsNet });
  const oss =
    kind === "B2C" &&
    sellerCountry &&
    customerCountry &&
    sellerCountry !== customerCountry &&
    dest.ossIossApplicability.oss;
  return {
    ok: true,
    actorId,
    kind,
    sellerCountry,
    customerCountry,
    deliveryCountry: dest.iso,
    rate: est.rate,
    net: est.net,
    vat: est.vat,
    gross: est.gross,
    ossCandidate: Boolean(oss),
    iossCandidate: false,
    liveOss: false,
    source: src.source,
    verificationStatus: dest.verificationStatus,
    liveLegal: false,
    filingReady: false,
    definitive: dest.verificationStatus !== "UNVERIFIED",
    note: "UNVERIFIED snapshot — not a filed return",
  };
}

function refundAdjust({ actorId = "nedim_bey", originalVat, correction }) {
  if (!check(actorId, "TAX_CALCULATE").ok) return { ok: false, code: "PERMISSION_DENIED" };
  if (originalVat == null || correction == null) return { ok: false, code: "MISSING_AMOUNT", status: "UNKNOWN" };
  return { ok: true, refund: Number(originalVat) - Number(correction), filingReady: false };
}

function germanyPolicy() {
  return {
    country: "DE",
    vatStandard: getStandardVat("DE"),
    separateFromEu26Reserve: true,
    liveLegal: false,
  };
}

function netIncomeReport({ actorId = "nedim_bey", incomeCountry, gross, vat, refund = 0, commission = 0, logistics = 0, supplierCost = 0 } = {}) {
  if (!check(actorId, "TAX_REPORT").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const inputs = { gross, vat, refund, commission, logistics, supplierCost };
  if (Object.values(inputs).some((v) => v == null || Number.isNaN(Number(v)))) {
    return { ok: false, code: "MISSING_AMOUNT", status: "UNKNOWN", definitive: false };
  }
  const net = Number(gross) - Number(vat) - Number(commission) - Number(logistics) - Number(supplierCost) + Number(refund);
  const eu26 = incomeCountry && incomeCountry !== "DE";
  const reserveRate = eu26 ? NET_INCOME_RESERVE_RATE : 0;
  const reserve = net > 0 ? net * reserveRate : 0;
  return {
    ok: true,
    incomeCountry,
    gross: Number(gross),
    vat: Number(vat),
    refund: Number(refund),
    commission: Number(commission),
    logistics: Number(logistics),
    supplierCost: Number(supplierCost),
    taxProvision: Number(vat),
    netIncome: net,
    emergencyReserve: reserve,
    reserveRate,
    reserveIsNotTax: true,
    bankTransfer: false,
    autoTransfer: false,
    liveLegal: false,
  };
}

function payTax() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "TAX_PAY" };
}

function fileReturn() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "TAX_FILE_RETURN" };
}

function draftReturn({ actorId = "nedim_bey", country }) {
  if (!check(actorId, "TAX_DRAFT").ok) return { ok: false, code: "PERMISSION_DENIED" };
  return { ok: true, draft: true, filed: false, country, liveLegal: false };
}

module.exports = { calculateVat, refundAdjust, germanyPolicy, netIncomeReport, payTax, fileReturn, draftReturn };
