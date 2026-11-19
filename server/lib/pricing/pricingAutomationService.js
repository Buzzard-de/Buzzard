/**
 * End-to-end dry pricing: supplier → shipping → marketplace fee → VAT → margin rules.
 */
const { quoteCommercialPrice, targetMarginForCategory } = require("../commerce/commercialCore");
const { evaluateOffer, MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_EUR, CATEGORY_TARGET_MARGIN } = require("../commerce/pricingPolicy");
const { createConnector } = require("../marketplace/marketplaceConnectorRegistry");
const { createShippingConnector } = require("../logistics/shippingConnectorRegistry");

function dryShippingQuote({ postalCode = "10115", weightGrams = 500 } = {}) {
  const adapter = createShippingConnector("DHL");
  const quote = adapter.quoteShipment({ postalCode, weightGrams, orderId: "DRY-PRICE" });
  if (quote?.ok && typeof quote.amount === "number") return { ok: true, amount: quote.amount, live: false };
  return { ok: true, amount: 6, live: false, code: "SHIPPING_DRY_DEFAULT" };
}

function dryMarketplaceCommission({ channel = "amazon", gross = 0 } = {}) {
  const connector = createConnector(channel);
  const fee = connector.feeEstimate({ gross: Number(gross) || 0 });
  return { ok: fee.ok, fee: fee.fee, channel, live: false };
}

function autoQuoteFromSupplierRecord(record = {}, options = {}) {
  const supplierCost = Number(record.supplier_price?.amount ?? record.supplierCost ?? record.price);
  const market = Number(
    record.comparable_market_price ?? options.comparableMarketPrice ?? options.market ?? 90
  );
  const category = options.category || { activeCategoryId: "cat-05", slug: "automotive" };
  const shipping = dryShippingQuote({ postalCode: options.postalCode });
  const provisionalGross = market > 0 ? market * 0.85 : 50;
  const commission = dryMarketplaceCommission({ channel: options.marketplace || "amazon", gross: provisionalGross });
  const paymentFee = Number(options.paymentFee ?? 1.2);
  const returnReserve = Number(record.return_reserve ?? options.returnReserve ?? 1);
  const otherCost = Number(record.other_cost ?? options.otherCost ?? 0);

  const quote = quoteCommercialPrice({
    supplierCost,
    shippingCost: shipping.amount,
    marketplaceFee: commission.fee,
    paymentFee,
    returnReserve,
    otherCost,
    comparableMarketPrice: market,
    country: options.country || record.country || "DE",
    category,
  });

  return {
    quote,
    components: {
      supplierCost,
      shippingCost: shipping.amount,
      marketplaceFee: commission.fee,
      paymentFee,
      returnReserve,
      otherCost,
      vatIntegrated: quote.vat != null,
    },
    live: false,
    livePriceWrite: false,
  };
}

function assertProfitableSale(quote = {}) {
  if (!quote.ok) {
    return {
      allowed: false,
      lossBlocked: true,
      code: quote.code || "PRICE_NOT_VIABLE",
      live: false,
    };
  }
  const check = evaluateOffer({
    offerPrice: quote.sellNet,
    comparableMarketPrice: quote.lowestComparableMarketPrice,
    categoryMargin: (quote.targetMargin ?? 0.07) - 0.01,
    supplierCost: quote.supplierCost,
    shippingCost: quote.shippingCost,
    marketplaceFee: quote.marketplaceFee,
    paymentFee: quote.paymentFee,
    returnReserve: quote.returnReserve,
    otherCost: quote.otherCost,
  });
  return {
    allowed: check.ok,
    lossBlocked: !check.ok,
    reasons: check.reasons,
    minNetRule: MIN_NET_PROFIT_EUR,
    undercutRule: MARKET_UNDERCUT_EUR,
    live: false,
  };
}

function marginPolicySnapshot() {
  return {
    automotive: CATEGORY_TARGET_MARGIN.automotive,
    drinks: CATEGORY_TARGET_MARGIN.drinks,
    other: CATEGORY_TARGET_MARGIN.other,
    minNetEur: MIN_NET_PROFIT_EUR,
    undercutEur: MARKET_UNDERCUT_EUR,
    sample: {
      automotive: targetMarginForCategory({ activeCategoryId: "cat-05", slug: "automotive" }),
      drinks: targetMarginForCategory({ id: "cat-46", slug: "getraenke" }),
      other: targetMarginForCategory({ slug: "textil" }),
    },
    live: false,
  };
}

module.exports = {
  autoQuoteFromSupplierRecord,
  dryShippingQuote,
  dryMarketplaceCommission,
  assertProfitableSale,
  marginPolicySnapshot,
};