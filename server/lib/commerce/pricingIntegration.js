/**
 * Deterministic pricing quote on canonical Product D.
 * AI may recommend. Approval does not write a price.
 */
const productService = require("../productService");
const { MODE, label } = require("../integrationMode");
const { evaluateOffer, selectTransportCost } = require("./pricingPolicy");
const { isSalesEnabled } = require("../salesMode");

function quotePrice(input = {}) {
  const product = input.productId ? productService.getProduct(input.productId) : null;
  const stored = product ? Number(product.price) : null;
  const storedValid = Number.isFinite(stored) && stored > 0;
  let shippingCost = input.shippingCost;
  let transport = null;
  if (input.rates || input.shippingIncluded === true || input.supplierOfferIncludesShipping === true) {
    transport = selectTransportCost(input);
    if (!transport.ok) {
      return {
        productId: product?.id || null,
        sku: product?.sku || null,
        cost: null,
        shippingCost: null,
        profit: null,
        policyStatus: "BLOCKED",
        policyCode: transport.code || "SHIPPING_RATE_UNVERIFIED",
        commerciallyEligible: false,
        transport,
        invented: false,
        recommendationOnly: true,
        valid: storedValid,
        livePriceWrite: false,
        ...label(MODE.DRY_RUN),
      };
    }
    shippingCost = transport.shippingCost;
  }
  const assessment = evaluateOffer({
    offerPrice: input.offerPrice,
    supplierCost: input.supplierCost,
    shippingCost,
    marketplaceFee: input.marketplaceFee,
    paymentFee: input.paymentFee,
    returnReserve: input.returnReserve,
    otherCost: input.operationalCost,
    category: input.category,
    comparableMarketPrice: input.comparableMarketPrice ?? input.marketPrice,
    currency: input.currency || product?.currency || "EUR",
    vatAmount: input.vatAmount,
    vatVerified: input.vatVerified,
    fx: input.fx,
    fxVerified: input.fxVerified,
    assetType: input.assetType,
    instrument: input.instrument,
  });
  const priced = assessment.eligible === true;
  return {
    productId: product?.id || null,
    sku: product?.sku || null,
    cost: assessment.cost,
    supplierCost: Object.prototype.hasOwnProperty.call(input, "supplierCost") ? input.supplierCost : null,
    minimumPrice: priced ? assessment.grossPrice : null,
    recommendedPrice: priced ? assessment.grossPrice : null,
    marketplacePrice: priced ? assessment.grossPrice : null,
    profit: assessment.profit,
    margin: assessment.margin,
    vatRate: assessment.vatOfficial === true ? input.vatRate ?? null : null,
    vatAmount: assessment.vatOfficial === true ? assessment.taxAmount : null,
    vatOfficial: assessment.vatOfficial === true,
    policyStatus: assessment.status,
    policyCode: assessment.code,
    policyReasons: assessment.reasons,
    targetMargin: assessment.targetMargin ?? null,
    marginRule: assessment.marginRule ?? null,
    commerciallyEligible: priced,
    currency: assessment.currency || input.currency || product?.currency || "EUR",
    actualPrice: Number.isFinite(stored) ? stored : null,
    recommendationOnly: true,
    valid: storedValid,
    invented: false,
    livePriceWrite: false,
    transport,
    ...label(MODE.DRY_RUN),
  };
}

function applyPriceChange({ productId, amount, actorType = "HUMAN", approved = false, permission = false } = {}) {
  if (actorType === "AI") {
    return { ok: false, code: "AI_PRICE_WRITE_DENIED", ...label(MODE.DISABLED) };
  }
  if (!permission || !approved) {
    return { ok: false, code: "APPROVAL_REQUIRED", stored: false, ...label(MODE.DISABLED) };
  }
  return {
    ok: false,
    code: "APPROVAL_NOT_EXECUTION",
    stored: false,
    live: false,
    purchased: false,
    ...label(MODE.DISABLED),
  };
}

function readSupplierCost(product) {
  if (!product) return undefined;
  const meta = product.metadata && typeof product.metadata === "object" ? product.metadata : {};
  const values = [product.supplierCost, product.supplier_cost, product.supplier_cost_eur, meta.supplierCost, meta.supplier_cost];
  for (const value of values) {
    if (value != null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0) return Number(value);
  }
  return undefined;
}

function priceAcceptedForCheckout(quote) {
  return Boolean(
    quote &&
      quote.policyStatus === "CALCULATED" &&
      quote.commerciallyEligible === true &&
      quote.invented === false,
  );
}

function assertCommercialCheckout({ quote, shipping } = {}) {
  const salesEnabled = isSalesEnabled();
  if (!priceAcceptedForCheckout(quote)) {
    return {
      ok: false,
      code: "PRICE_POLICY_BLOCKED",
      status: "BLOCKED",
      commercialEligibility: "BLOCKED",
      orderCreated: false,
      paymentAuthorized: false,
      salesEnabled,
    };
  }
  if (!shipping || shipping.status !== "VERIFIED" || shipping.commercialEligibility !== "ELIGIBLE" || shipping.shippingCost == null) {
    return {
      ok: false,
      code: "SHIPPING_RATE_UNVERIFIED",
      status: "SHIPPING_RATE_UNVERIFIED",
      commercialEligibility: "BLOCKED",
      orderCreated: false,
      paymentAuthorized: false,
      salesEnabled,
    };
  }
  return {
    ok: false,
    code: salesEnabled ? "PAYMENT_UNVERIFIED" : "SALES_CLOSED",
    commercialEligibility: "BLOCKED",
    orderCreated: false,
    paymentAuthorized: false,
    checkoutAllowed: false,
    live: false,
    salesEnabled,
    reasons: salesEnabled
      ? ["PAYMENT_UNVERIFIED", "STOCK_UNVERIFIED"]
      : ["SALES_CLOSED", "PAYMENT_UNVERIFIED", "STOCK_UNVERIFIED"],
  };
}

module.exports = { quotePrice, applyPriceChange, readSupplierCost, priceAcceptedForCheckout, assertCommercialCheckout };
