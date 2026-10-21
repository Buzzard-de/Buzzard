/**
 * Deterministic pricing quote on canonical Product D.
 * AI may recommend. Actual price write needs rule + permission + approval.
 */
const productService = require("../productService");
const { calculateSalePrice, validatePrice, marginPercent } = require("../pricing");
const events = require("../eventBus");
const exceptions = require("../exceptionBus");
const { MODE, label } = require("../integrationMode");

function quotePrice({
  productId,
  supplierCost,
  shippingCost = 0,
  marketplaceFee = 0,
  paymentFee = 0,
  vatRate = 0.19,
  returnReserve = 0,
  operationalCost = 0,
  minimumProfit = 0,
  targetMargin = 0.38,
  currency,
} = {}) {
  const product = productId ? productService.getProduct(productId) : null;
  const costBase = Number(supplierCost ?? product?.metadata?.supplierCost ?? product?.price ?? 0);
  const extras =
    Number(shippingCost) +
    Number(marketplaceFee) +
    Number(paymentFee) +
    Number(returnReserve) +
    Number(operationalCost);
  const landed = costBase + extras;
  const markupPercent = Number(targetMargin) <= 1 ? Number(targetMargin) * 100 : Number(targetMargin);
  const recommended = calculateSalePrice({
    supplierPrice: landed,
    markupPercent,
    minimumMarginPercent: 12,
    currency: currency || product?.currency || "EUR",
  });
  const vatAmount = Math.round(recommended.amount * Number(vatRate) * 100) / 100;
  const profit = Math.round((recommended.amount - landed) * 100) / 100;
  const minByProfit = landed + Number(minimumProfit);
  const minimumPrice = Math.round(Math.max(landed * 1.12, minByProfit) * 100) / 100;
  const valid = validatePrice(recommended);
  if (!valid.ok) {
    exceptions.emit({
      type: exceptions.TYPES.PRICE_CONFLICT,
      source: "pricingIntegration",
      entity: "product",
      entityId: product?.id || null,
      message: valid.error,
      retryable: false,
    });
  }

  return {
    productId: product?.id || null,
    sku: product?.sku || null,
    cost: Math.round(landed * 100) / 100,
    supplierCost: costBase,
    extras,
    minimumPrice,
    recommendedPrice: recommended.amount,
    marketplacePrice: recommended.amount,
    profit,
    margin: marginPercent(recommended.amount, landed),
    vatRate,
    vatAmount,
    currency: recommended.currency,
    actualPrice: product ? Number(product.price) : null,
    recommendationOnly: true,
    valid: valid.ok,
    ...label(MODE.DRY_RUN),
  };
}

function applyPriceChange({ productId, amount, actorType = "HUMAN", approved = false, permission = false } = {}) {
  if (actorType === "AI") {
    return { ok: false, code: "AI_PRICE_WRITE_DENIED", ...label(MODE.DISABLED) };
  }
  if (!permission || !approved) {
    return { ok: false, code: "APPROVAL_REQUIRED", ...label(MODE.DISABLED) };
  }
  const valid = validatePrice(amount);
  if (!valid.ok) return { ok: false, code: valid.error, ...label(MODE.DRY_RUN) };
  const product = productService.updateProduct(productId, { price: valid.value.amount }, { source: "ADMIN" });
  events.emit({
    type: events.TYPES.PriceUpdated,
    aggregateId: productId,
    aggregateType: "price",
    payload: { productId, amount: valid.value.amount },
  });
  return { ok: true, product, ...label(MODE.DRY_RUN) };
}

module.exports = { quotePrice, applyPriceChange };
