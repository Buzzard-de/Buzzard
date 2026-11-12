/**
 * Authoritative commercial pricing policy.
 * Category margins, the cost stack, and eligibility are decided here.
 * A caller-supplied margin does not replace a category rule.
 * Missing supplier, shipping, marketplace, payment, return, FX, or VAT
 * stays UNKNOWN or BLOCKED. A missing amount is never stored as zero.
 * This module does not publish a price, take a payment, or enable sales.
 */
const { decideAsset } = require("../banking/eu27/fiatPolicy");
const { quoteRate } = require("../banking/eu27/fx");
const { isSalesEnabled } = require("../salesMode");

const MIN_NET_PROFIT_EUR = 0.5;
const MARKET_UNDERCUT_EUR = 0.1;
const CATEGORY_MARGINS = Object.freeze({
  automotive: 0.11,
  beverage_crate: 0.15,
  other: 0.07,
});
const REQUIRED_COST_KEYS = Object.freeze([
  "supplierCost",
  "shippingCost",
  "marketplaceFee",
  "paymentFee",
  "returnReserve",
]);

function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

function isPresent(value) {
  if (value == null || value === "") return false;
  return Number.isFinite(Number(value));
}

function rejectCard(input) {
  for (const value of Object.values(input || {})) {
    if (typeof value !== "string") continue;
    const digits = value.replace(/[\s-]/g, "");
    if (/\d{13,19}/.test(digits)) {
      return { ok: false, status: "BLOCKED", code: "CARD_DATA_REJECTED", stored: false, invented: false, profit: null };
    }
  }
  return null;
}

function resolveCategoryMargin(category) {
  const key = String(category || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ");
  if (key === "automotive" || key === "bz.01" || key === "automotive and kfz") {
    return { margin: CATEGORY_MARGINS.automotive, rule: "AUTOMOTIVE" };
  }
  if (
    key === "beverage_crate" ||
    key === "beverage-crate" ||
    key === "beverage crate" ||
    key === "getraenkekiste"
  ) {
    return { margin: CATEGORY_MARGINS.beverage_crate, rule: "BEVERAGE_CRATE" };
  }
  return { margin: CATEGORY_MARGINS.other, rule: "DEFAULT_OTHER" };
}

function pick(input, primary, alias) {
  if (Object.prototype.hasOwnProperty.call(input, primary)) return { present: true, value: input[primary] };
  if (alias && Object.prototype.hasOwnProperty.call(input, alias)) return { present: true, value: input[alias] };
  return { present: false, value: undefined };
}

function assignPick(target, key, picked) {
  if (picked.present) target[key] = picked.value;
}

function sumLanded(input = {}, extraRequired = []) {
  const keys = [...REQUIRED_COST_KEYS, ...extraRequired];
  const missing = [];
  const negative = [];
  let total = 0;
  const consume = (key, required) => {
    const present = Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined;
    if (!present) {
      if (required) missing.push(key);
      return;
    }
    if (!isPresent(input[key])) {
      missing.push(key);
      return;
    }
    if (Number(input[key]) < 0) {
      negative.push(key);
      return;
    }
    total += Number(input[key]);
  };
  for (const key of keys) consume(key, true);
  if (!extraRequired.includes("otherCost")) consume("otherCost", false);
  if (!extraRequired.includes("vatOnFees")) consume("vatOnFees", false);
  if (missing.length || negative.length) {
    return {
      ok: false,
      status: "BLOCKED",
      code: negative.length ? "NEGATIVE_COST" : "MISSING_COST",
      missing,
      negative,
      amount: null,
      invented: false,
    };
  }
  return { ok: true, status: "CALCULATED", code: "COST_CALCULATED", missing: [], negative: [], amount: roundMoney(total), invented: false };
}

function landedCost(input = {}) {
  const sum = sumLanded(input);
  return sum.ok ? sum.amount : null;
}

const CARRIER_NAMES = Object.freeze(["DHL", "DPD", "GLS", "HERMES", "UPS"]);

function roundKg(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function chargeableWeightKg(weightKg, dimensions, divisor) {
  const actual = Number(weightKg);
  const actualOk = Number.isFinite(actual) && actual > 0;
  const divisorOk = Number.isFinite(Number(divisor)) && Number(divisor) > 0;
  if (!divisorOk || !dimensionsOk(dimensions) || !actualOk) {
    return {
      chargeableKg: actualOk ? roundKg(actual) : null,
      volumetricKg: null,
      volumetricRule: "NOT_PUBLISHED",
    };
  }
  const volume = Number(dimensions.lengthCm) * Number(dimensions.widthCm) * Number(dimensions.heightCm);
  const volumetricKg = roundKg(volume / Number(divisor));
  return {
    chargeableKg: roundKg(Math.max(actual, volumetricKg)),
    volumetricKg,
    volumetricRule: "RATE_DIVISOR",
  };
}

function dimensionsOk(dimensions) {
  if (!dimensions || typeof dimensions !== "object" || Array.isArray(dimensions)) return false;
  return ["lengthCm", "widthCm", "heightCm"].every((key) => Number.isFinite(Number(dimensions[key])) && Number(dimensions[key]) > 0);
}

function assessShipping(input = {}) {
  const country = String(input.country || "").trim().toUpperCase();
  const zone = String(input.zone || input.deliveryZone || "").trim();
  const service = String(input.service || input.serviceType || "").trim();
  const carrier = String(input.carrier || "").trim().toUpperCase();
  const weightRaw = input.weightKg ?? input.weight;
  const amountRaw = input.shippingCost ?? input.amount ?? input.rate;
  const missing = [];
  if (!country) missing.push("country");
  if (!zone) missing.push("zone");
  if (!isPresent(weightRaw) || Number(weightRaw) <= 0) missing.push("weight");
  if (!dimensionsOk(input.dimensions)) missing.push("dimensions");
  if (!service) missing.push("service");
  if (!carrier) missing.push("carrier");
  const verified = input.verified === true || input.rateVerified === true;
  if (!verified) missing.push("verifiedCarrierRate");
  const base = {
    live: false,
    integration: "BLOCKED",
    apiConnected: false,
    invented: false,
    shipmentCreated: false,
  };
  if (missing.length) {
    return {
      ...base,
      ok: false,
      shippingCost: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      code: "SHIPPING_RATE_UNVERIFIED",
      missing,
    };
  }
  if (!isPresent(amountRaw) || Number(amountRaw) < 0) {
    return {
      ...base,
      ok: false,
      shippingCost: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      code: "INVALID_SHIPPING_RATE",
      missing: [],
    };
  }
  if (Number(amountRaw) === 0 && service.toLowerCase() !== "pickup") {
    return {
      ...base,
      ok: false,
      shippingCost: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      code: "ZERO_RATE_REJECTED",
      missing: [],
    };
  }
  return {
    ...base,
    ok: true,
    shippingCost: roundMoney(amountRaw),
    status: "VERIFIED",
    commercialEligibility: "ELIGIBLE",
    code: "SHIPPING_RATE_VERIFIED",
    missing: [],
    country,
    zone,
    service,
    carrier,
    weightKg: Number(weightRaw),
  };
}

function readSuppliedShipping(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    return { amount: null, status: "SHIPPING_RATE_UNVERIFIED", commercialEligibility: "BLOCKED", inventedZero: false };
  }
  return {
    amount: roundMoney(value),
    status: "SHIPPING_RATE_UNVERIFIED",
    commercialEligibility: "BLOCKED",
    inventedZero: false,
  };
}

function inclusionEvidenceOk(value) {
  if (typeof value === "string" && value.trim()) return true;
  if (value && typeof value === "object" && (value.supplierOfferId || value.documentId)) return true;
  return false;
}

function rateFits(rate, lane) {
  if (!rate || rate.suitable !== true) return false;
  if (rate.origin && String(rate.origin).toUpperCase() !== String(lane.origin).toUpperCase()) return false;
  if (Array.isArray(rate.countries) && !rate.countries.map((code) => String(code).toUpperCase()).includes(lane.country)) {
    return false;
  }
  if (Array.isArray(rate.zones) && !rate.zones.includes(lane.zone)) return false;
  if (rate.maxWeightKg != null && lane.weightKg > Number(rate.maxWeightKg)) return false;
  if (rate.minWeightKg != null && lane.weightKg < Number(rate.minWeightKg)) return false;
  if (rate.maxLengthCm != null && Number(lane.dimensions.lengthCm) > Number(rate.maxLengthCm)) return false;
  return true;
}

function selectTransportCost(input = {}) {
  const origin = String(input.origin || input.supplierOrigin || "").trim();
  const country = String(input.country || input.destinationCountry || "").trim().toUpperCase();
  const zone = String(input.zone || input.deliveryZone || "").trim();
  const weightRaw = input.weightKg ?? input.weight;
  const dimensions = input.dimensions;
  const missing = [];
  if (!origin) missing.push("origin");
  if (!country) missing.push("country");
  if (!zone) missing.push("zone");
  if (!isPresent(weightRaw) || Number(weightRaw) <= 0) missing.push("weight");
  if (!dimensionsOk(dimensions)) missing.push("dimensions");
  const measured = chargeableWeightKg(weightRaw, dimensions, null);
  const base = {
    live: false,
    integration: "BLOCKED",
    apiConnected: false,
    invented: false,
    shipmentCreated: false,
    doubleCount: false,
    volumetricKg: measured.volumetricKg,
    volumetricRule: measured.volumetricRule,
    chargeableKg: measured.chargeableKg,
  };
  const included = input.shippingIncluded === true || input.supplierOfferIncludesShipping === true;
  const evidence = input.inclusionEvidence || input.shippingIncludedEvidence;
  if (included) {
    if (!inclusionEvidenceOk(evidence) || missing.length) {
      return {
        ...base,
        ok: false,
        shippingCost: null,
        status: "SHIPPING_RATE_UNVERIFIED",
        commercialEligibility: "BLOCKED",
        code: "INCLUDED_SHIPPING_UNPROVEN",
        missing,
        inclusionEvidence: null,
      };
    }
    return {
      ...base,
      ok: true,
      shippingCost: 0,
      status: "VERIFIED",
      commercialEligibility: "ELIGIBLE",
      code: "SHIPPING_INCLUDED_IN_SUPPLIER_OFFER",
      inclusionEvidence: evidence,
      additionalShipping: 0,
      carrierRatesIgnored: true,
      selected: null,
    };
  }
  if (missing.length) {
    return {
      ...base,
      ok: false,
      shippingCost: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      code: "SHIPPING_RATE_UNVERIFIED",
      missing,
    };
  }
  const lane = { origin, country, zone, weightKg: Number(weightRaw), dimensions };
  const offers = Array.isArray(input.rates) ? input.rates : [];
  const suitable = [];
  for (const rate of offers) {
    const measuredRate = chargeableWeightKg(lane.weightKg, dimensions, rate.volumetricDivisor);
    if (rate.volumetricDivisor != null && measuredRate.volumetricRule !== "RATE_DIVISOR") continue;
    const laneForRate = { ...lane, weightKg: measuredRate.chargeableKg };
    if (!rateFits(rate, laneForRate)) continue;
    const assessment = assessShipping({
      country,
      zone,
      weightKg: laneForRate.weightKg,
      dimensions,
      service: rate.service,
      carrier: rate.carrier,
      shippingCost: rate.amount ?? rate.shippingCost,
      verified: rate.verified === true,
    });
    if (!assessment.ok) continue;
    suitable.push({
      carrier: String(rate.carrier || "").toUpperCase(),
      service: rate.service,
      amount: assessment.shippingCost,
      contracted: rate.contracted === true,
      chargeableKg: measuredRate.chargeableKg,
      volumetricKg: measuredRate.volumetricKg,
      volumetricRule: measuredRate.volumetricRule,
    });
  }
  if (!suitable.length) {
    return {
      ...base,
      ok: false,
      shippingCost: null,
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      code: "NO_VERIFIED_SUITABLE_RATE",
      compared: 0,
      rejected: offers.length,
    };
  }
  suitable.sort((a, b) => a.amount - b.amount || String(a.carrier).localeCompare(String(b.carrier)));
  const selected = suitable[0];
  return {
    ...base,
    ok: true,
    shippingCost: selected.amount,
    status: "VERIFIED",
    commercialEligibility: "ELIGIBLE",
    code: "LOWEST_VERIFIED_TRANSPORT",
    selected,
    compared: suitable,
    rejected: offers.length - suitable.length,
    chargeableKg: selected.chargeableKg,
    volumetricKg: selected.volumetricKg,
    volumetricRule: selected.volumetricRule,
  };
}

function priceWithTransport(input = {}) {
  const transport = selectTransportCost(input);
  if (!transport.ok) {
    return {
      ok: false,
      eligible: false,
      status: "BLOCKED",
      code: transport.code || "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      shippingCost: null,
      profit: null,
      invented: false,
      transport,
      salesEnabled: isSalesEnabled(),
    };
  }
  const offer = evaluateOffer({ ...input, shippingCost: transport.shippingCost });
  return { ...offer, transport, shippingCost: transport.shippingCost, doubleCount: false };
}

function carrierRateStatus() {
  return CARRIER_NAMES.map((carrier) => ({
    carrier,
    integration: "BLOCKED",
    live: false,
    apiConnected: false,
    shippingCost: null,
    status: "SHIPPING_RATE_UNVERIFIED",
    commercialEligibility: "BLOCKED",
    reason: "No carrier API credential and no verified tariff snapshot",
  }));
}

function resolveFx(input = {}) {
  const currency = input.currency || "EUR";
  const asset = decideAsset({
    currency,
    assetType: input.assetType || "fiat",
    instrument: input.instrument,
  });
  if (!asset.ok) {
    return { ok: false, status: "BLOCKED", code: asset.code, currency: asset.currency || null, rate: null, invented: false };
  }
  if (!Object.prototype.hasOwnProperty.call(input, "fx") || input.fx == null || input.fx === "") {
    const quoted = quoteRate({ base: asset.currency, quote: "EUR" });
    if (!quoted.ok) {
      return { ok: false, status: "BLOCKED", code: "FX_RATE_UNKNOWN", currency: asset.currency, rate: null, invented: false };
    }
    return { ok: true, currency: asset.currency, rate: Number(quoted.rate), source: quoted.code, invented: false };
  }
  return { ok: false, status: "BLOCKED", code: "FX_UNVERIFIED", currency: asset.currency, rate: null, invented: false, callerFlagIgnored: true, source: "UNKNOWN" };
}

function resolveTax(input = {}) {
  if (input.vatSnapshotOfficial === true) {
    return { ok: false, status: "BLOCKED", code: "VAT_SNAPSHOT_NOT_OFFICIAL", official: false, amount: null, invented: false };
  }
  if (input.vatVerified === true && isPresent(input.vatAmount)) {
    if (Number(input.vatAmount) < 0) {
      return { ok: false, status: "BLOCKED", code: "NEGATIVE_COST", official: false, amount: null, invented: false };
    }
    return {
      ok: true,
      status: "VERIFIED_AMOUNT",
      code: "VAT_AMOUNT_VERIFIED",
      official: true,
      amount: roundMoney(Number(input.vatAmount)),
      invented: false,
    };
  }
  return { ok: false, status: "UNKNOWN", code: "VAT_UNKNOWN", official: false, amount: null, invented: false };
}

function supplierCostBlocked(input = {}) {
  if (
    input.mock === true
    || input.supplierMock === true
    || input.supplierSource === "mock"
    || input.supplierVerified === false
    || input.supplierLive === true
  ) {
    return {
      ok: false,
      eligible: false,
      status: "UNKNOWN",
      commercialEligibility: "BLOCKED",
      reasons: ["SUPPLIER_COST_UNVERIFIED"],
      code: "SUPPLIER_COST_UNVERIFIED",
      cost: null,
      profit: null,
      margin: null,
      supplierCost: null,
      invented: false,
      livePriceWrite: false,
      salesEnabled: isSalesEnabled(),
    };
  }
  return null;
}

function evaluateOffer(input = {}) {
  const supplier = supplierCostBlocked(input);
  if (supplier) return supplier;
  const card = rejectCard(input);
  if (card) return { ...card, reasons: [card.code], eligible: false, salesEnabled: isSalesEnabled(), livePriceWrite: false };
  const price = Number(input.offerPrice);
  const reasons = [];
  if (!Number.isFinite(price) || price <= 0) reasons.push("PRICE_INVALID");
  const fx = resolveFx(input);
  if (!fx.ok) {
    return {
      ok: false,
      eligible: false,
      status: "BLOCKED",
      reasons: [fx.code],
      code: fx.code,
      cost: null,
      profit: null,
      margin: null,
      currency: fx.currency || null,
      invented: false,
      livePriceWrite: false,
      salesEnabled: isSalesEnabled(),
    };
  }
  if (reasons.includes("PRICE_INVALID")) {
    return {
      ok: false,
      eligible: false,
      status: "BLOCKED",
      reasons,
      code: "PRICE_INVALID",
      cost: null,
      profit: null,
      margin: null,
      invented: false,
      livePriceWrite: false,
      salesEnabled: isSalesEnabled(),
    };
  }
  const sum = sumLanded(input);
  if (!sum.ok) {
    return {
      ok: false,
      eligible: false,
      status: "BLOCKED",
      reasons: [sum.code],
      code: sum.code,
      missing: sum.missing,
      negative: sum.negative,
      cost: null,
      profit: null,
      margin: null,
      invented: false,
      livePriceWrite: false,
      salesEnabled: isSalesEnabled(),
    };
  }
  const category = resolveCategoryMargin(input.category);
  const suppliedMargin = Number(input.categoryMargin);
  const marginOverrideIgnored = Number.isFinite(suppliedMargin) && Math.abs(suppliedMargin - category.margin) > 1e-9;
  const tax = resolveTax(input);
  const cost = tax.ok ? roundMoney(sum.amount * fx.rate + tax.amount) : null;
  const stackProfit = roundMoney(price - roundMoney(sum.amount * fx.rate));
  const profit = tax.ok ? roundMoney(price - cost) : null;
  const margin = profit != null && price > 0 ? Math.round((profit / price) * 10000) / 10000 : null;
  const market = isPresent(input.comparableMarketPrice) ? Number(input.comparableMarketPrice) : null;
  const targetMax = market == null ? null : roundMoney(market - MARKET_UNDERCUT_EUR);
  let competitivePriceEligible = null;
  if (targetMax != null && cost != null) {
    const viable = roundMoney(targetMax - (cost - tax.amount)) + 1e-9 >= MIN_NET_PROFIT_EUR;
    competitivePriceEligible = viable && price <= targetMax + 1e-9;
    if (viable && price > targetMax + 1e-9) reasons.push("ABOVE_UNDERCUT_TARGET");
  } else if (targetMax != null && cost == null) {
    const viable = roundMoney(targetMax - roundMoney(sum.amount * fx.rate)) + 1e-9 >= MIN_NET_PROFIT_EUR;
    competitivePriceEligible = viable ? null : false;
  }
  if (stackProfit < 0 || (profit != null && profit < 0)) reasons.push("NEGATIVE_PROFIT");
  if (stackProfit + 1e-9 < MIN_NET_PROFIT_EUR || (profit != null && profit + 1e-9 < MIN_NET_PROFIT_EUR)) {
    reasons.push("MIN_NET_PROFIT");
  }
  if (margin != null && margin + 1e-9 < category.margin) reasons.push("CATEGORY_MARGIN");
  if (!tax.ok) reasons.push(tax.code);
  const eligible = reasons.length === 0;
  return {
    ok: eligible,
    eligible,
    status: eligible ? "CALCULATED" : tax.ok ? "BLOCKED" : reasons.some((code) => code !== "VAT_UNKNOWN") ? "BLOCKED" : "UNKNOWN",
    reasons,
    code: reasons[0] || "CALCULATED",
    cost,
    stackCost: roundMoney(sum.amount * fx.rate),
    profit,
    margin,
    grossPrice: price,
    netRevenue: tax.ok ? roundMoney(price - tax.amount) : null,
    targetMargin: category.margin,
    marginRule: category.rule,
    marginOverrideIgnored,
    targetMax,
    minNetProfit: MIN_NET_PROFIT_EUR,
    undercutEur: MARKET_UNDERCUT_EUR,
    minimumProfitEligible: profit != null && profit + 1e-9 >= MIN_NET_PROFIT_EUR,
    competitivePriceEligible,
    taxStatus: tax.status,
    taxAmount: tax.amount,
    vatOfficial: tax.official === true,
    currency: fx.currency,
    fxRate: fx.rate,
    invented: false,
    livePriceWrite: false,
    salesEnabled: isSalesEnabled(),
  };
}

function recommendPrice(input = {}) {
  const supplier = supplierCostBlocked(input);
  if (supplier) return { ...supplier, publish: false, humanReview: true };
  const card = rejectCard(input);
  if (card) return { ...card, publish: false };
  const fx = resolveFx(input);
  if (!fx.ok) return { ...fx, ok: false, publish: false, profit: null };
  const margin = resolveCategoryMargin(input.category);
  const components = {};
  assignPick(components, "supplierCost", pick(input, "supplierCost"));
  assignPick(components, "shippingCost", pick(input, "shippingCost", "shipping"));
  assignPick(components, "marketplaceFee", pick(input, "marketplaceFee", "marketplaceCommission"));
  assignPick(components, "paymentFee", pick(input, "paymentFee", "paymentFees"));
  assignPick(components, "returnReserve", pick(input, "returnReserve"));
  assignPick(components, "vatOnFees", pick(input, "vatOnFees", "vat"));
  assignPick(components, "otherCost", pick(input, "otherCost"));
  const sum = sumLanded(components, ["vatOnFees"]);
  if (!sum.ok) {
    return { ok: false, status: "BLOCKED", code: "MISSING_COST", missing: sum.missing, publish: false, humanReview: true, invented: false };
  }
  const landed = roundMoney(sum.amount * fx.rate);
  let price = roundMoney(landed / (1 - margin.margin));
  if (roundMoney(price - landed) + 1e-9 < MIN_NET_PROFIT_EUR) price = roundMoney(landed + MIN_NET_PROFIT_EUR);
  const marketPick = pick(input, "marketPrice", "comparableMarketPrice");
  const marketValue = marketPick.present ? marketPick.value : undefined;
  let humanReview = false;
  let undercutBlockedByMinNet = false;
  if (isPresent(marketValue)) {
    const beat = roundMoney(Number(marketValue) - MARKET_UNDERCUT_EUR);
    if (roundMoney(beat - landed) + 1e-9 >= MIN_NET_PROFIT_EUR) price = roundMoney(Math.min(price, beat));
    else {
      humanReview = true;
      undercutBlockedByMinNet = true;
    }
  }
  const net = roundMoney(price - landed);
  if (net + 1e-9 < MIN_NET_PROFIT_EUR) {
    return { ok: false, code: "BELOW_MIN_NET", publish: false, humanReview: true, invented: false, profit: net };
  }
  return {
    ok: true,
    status: "CALCULATED",
    landed,
    price,
    net,
    margin: Number((net / price).toFixed(4)),
    targetMargin: margin.margin,
    marginRule: margin.rule,
    minNet: MIN_NET_PROFIT_EUR,
    undercutBlockedByMinNet,
    humanReview,
    publish: false,
    livePublish: false,
    autoSale: false,
    currency: fx.currency,
    fxRate: fx.rate,
    taxOfficial: false,
    invented: false,
    salesEnabled: isSalesEnabled(),
  };
}

module.exports = {
  MIN_NET_PROFIT_EUR,
  MARKET_UNDERCUT_EUR,
  CATEGORY_MARGINS,
  roundMoney,
  resolveCategoryMargin,
  sumLanded,
  landedCost,
  resolveFx,
  resolveTax,
  evaluateOffer,
  recommendPrice,
  assessShipping,
  readSuppliedShipping,
  selectTransportCost,
  priceWithTransport,
  carrierRateStatus,
  CARRIER_NAMES,
};
