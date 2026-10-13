/**
 * Canonical price quote. Wraps server/lib/pricing.js.
 * Does not add the €0.10 undercut rule.
 * Missing supplier cost or tax/commission inputs do not invent certainty.
 */

const pricing = require("../pricing");
const { MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_IMPLEMENTED, MARKET_UNDERCUT_EUR } = require("../pusat/constants");

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const sign = n < 0 ? -1 : 1;
  // Half-up to cents. Plain Math.round(n * 100) drops 1.005 to 1.00 in IEEE float.
  return sign * (Math.round(Math.abs(n) * 100 + 1e-10) / 100);
}

function quote(input = {}) {
  const currency = String(input.currency || "EUR").trim().toUpperCase();
  if (currency !== "EUR") {
    return {
      ok: false,
      failClosed: true,
      engine: "server/lib/pricing.js",
      reason: "CURRENCY_UNSUPPORTED",
      currency,
      invented: false,
      conversionInvented: false,
      marketUndercutImplemented: MARKET_UNDERCUT_IMPLEMENTED,
      note: "No FX rate is invented. Quotes stay EUR-only unless a verified conversion exists.",
    };
  }
  const supplierCost = money(input.supplierCost ?? input.supplierPrice);
  if (supplierCost == null || supplierCost <= 0) {
    return {
      ok: false,
      failClosed: true,
      engine: "server/lib/pricing.js",
      reason: "MISSING_SUPPLIER_COST",
      invented: false,
      marketUndercutImplemented: MARKET_UNDERCUT_IMPLEMENTED,
    };
  }

  const shippingCost = money(input.shippingCost);
  const extraCosts = money(input.extraCosts);
  if (shippingCost != null && shippingCost < 0) {
    return { ok: false, failClosed: true, reason: "NEGATIVE_SHIPPING", invented: false, engine: "server/lib/pricing.js" };
  }
  const shipping = shippingCost ?? 0;
  const extras = extraCosts ?? 0;
  const returnReserve = money(input.returnReserve);
  const commissionRate = input.marketplaceCommissionRate != null ? Number(input.marketplaceCommissionRate) : null;
  const taxRate = input.taxRate != null ? Number(input.taxRate) : null;
  if ((commissionRate != null && (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate >= 1))
    || (taxRate != null && (!Number.isFinite(taxRate) || taxRate < 0 || taxRate >= 1))) {
    return { ok: false, failClosed: true, reason: "INVALID_FEE_RATES", invented: false, engine: "server/lib/pricing.js" };
  }
  const missingOptional = [];
  if (returnReserve == null) missingOptional.push("returnReserve");
  if (commissionRate == null || !Number.isFinite(commissionRate)) missingOptional.push("marketplaceCommissionRate");
  if (taxRate == null || !Number.isFinite(taxRate)) missingOptional.push("taxRate");

  const base = pricing.calculateSalePrice({
    supplierPrice: supplierCost,
    markupPercent: input.markupPercent ?? 38,
    minimumMarginPercent: input.minimumMarginPercent ?? 12,
    currency,
  });

  const landed = money(supplierCost + shipping + extras + (returnReserve || 0));
  let requiredSale = landed + MIN_NET_PROFIT_EUR;
  if (missingOptional.length === 0) {
    const denom = 1 - commissionRate - taxRate;
    if (denom <= 0) {
      return { ok: false, failClosed: true, reason: "INVALID_FEE_RATES", invented: false, engine: "server/lib/pricing.js" };
    }
    requiredSale = (landed + MIN_NET_PROFIT_EUR) / denom;
  }
  let sale = money(Math.max(base.amount, requiredSale));
  let commission = commissionRate != null ? money(sale * commissionRate) : null;
  let tax = taxRate != null ? money(sale * taxRate) : null;
  let net = commission != null && tax != null ? money(sale - landed - commission - tax) : null;
  if (missingOptional.length === 0 && net != null) {
    for (let i = 0; i < 5 && net + 1e-9 < MIN_NET_PROFIT_EUR; i += 1) {
      sale = money(sale + 0.01);
      commission = money(sale * commissionRate);
      tax = money(sale * taxRate);
      net = money(sale - landed - commission - tax);
    }
  }
  const netBeforeOptional = money(sale - landed);

  const precise = missingOptional.length === 0 && net != null;
  const marginOk = pricing.meetsMinimumMargin({
    salePrice: sale,
    purchasePrice: supplierCost,
    minimumMarginPercent: input.minimumMarginPercent ?? 12,
  });

  return {
    ok: true,
    failClosed: false,
    engine: "server/lib/pricing.js",
    currency,
    supplierCost,
    shippingCost: shipping,
    extraCosts: extras,
    returnReserve: returnReserve,
    marketplaceCommission: commission,
    tax,
    salePrice: sale,
    netProfit: net,
    netBeforeOptional,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    minMarginMet: marginOk,
    saleApproved: precise && net != null && net + 1e-9 >= MIN_NET_PROFIT_EUR,
    belowMinProfit: precise && net != null && net + 1e-9 < MIN_NET_PROFIT_EUR,
    precise,
    missingOptional,
    invented: false,
    pythonPolicyNote: "Python MIN_NET_PROFIT=0.50 is documented separately and is not silently merged.",
    marketUndercut: { amountEur: MARKET_UNDERCUT_EUR, implemented: MARKET_UNDERCUT_IMPLEMENTED },
  };
}

function recordHistory(db, input = {}, quoteResult = null) {
  const quoted = quoteResult || quote(input);
  if (!quoted.ok) return { ...quoted, recorded: false, published: false };
  if (!db) return { ...quoted, recorded: false, published: false };
  const crypto = require("crypto");
  const id = `sph_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `INSERT INTO software_price_history(
      id, sku, channel, sale_price, net_profit, currency, sale_approved, published, details_json
    ) VALUES(?,?,?,?,?,?,?,0,?)`
  ).run(
    id,
    String(input.sku || "unknown"),
    String(input.channel || "direct"),
    quoted.salePrice == null ? 0 : quoted.salePrice,
    quoted.netProfit,
    quoted.currency || "EUR",
    quoted.saleApproved ? 1 : 0,
    JSON.stringify({ failClosed: Boolean(quoted.failClosed), invented: false, published: false })
  );
  return { ...quoted, recorded: true, published: false, historyId: id };
}

function channelQuote(input = {}) {
  const channel = String(input.channel || "direct");
  const commissions = {
    direct: input.marketplaceCommissionRate ?? 0,
    amazon: input.marketplaceCommissionRate ?? 0.15,
    ebay: input.marketplaceCommissionRate ?? 0.12,
    kaufland: input.marketplaceCommissionRate ?? 0.12,
  };
  const quoted = quote({
    ...input,
    marketplaceCommissionRate: commissions[channel] ?? input.marketplaceCommissionRate,
  });
  return {
    ...quoted,
    channel,
    published: false,
    fxEnabled: false,
    undercutApplied: false,
  };
}

module.exports = { quote, recordHistory, channelQuote };
