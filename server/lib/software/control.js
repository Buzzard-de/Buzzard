/**
 * Shared control gate. Engines keep their own results.
 * The gate checks the actor, logs the call, and does not approve or sell.
 */
const ENGINES = {
  pricing: {
    quotePrice: (args) => require("../commerce/pricingIntegration").quotePrice(args),
    applyPriceChange: (args) => require("../commerce/pricingIntegration").applyPriceChange(args),
  },
  inventory: {
    inspectFeeds: (args) => require("../buzzardNative/core/specialists/stockEngine").inspectFeeds(args),
    getInventory: (args) => require("../commerce/inventoryIntegration").getInventory(args.productId),
    buyStock: () => require("../buzzardNative/core/specialists/stockEngine").buyStock(),
  },
  payment: {
    capturePayment: () => require("../commerce/paymentService").capturePayment(),
    authorizePayment: (args) => require("../commerce/paymentService").authorizePayment(args),
  },
  shipping: {
    calculateShipping: (args) => require("../commerce/shippingProvider").calculateShipping(args),
  },
  supplier: {
    placeOrder: () => new (require("../adapters/interCarsAdapter").InterCarsAdapter)().placeOrder(),
  },
  identity: {
    phase3Identity: (args) => require("../commerce/phase3Identity").phase3Identity(args.orderId, args),
  },
  returns: {
    startReturn: (args) => require("../logistics/v5/returnsEngine").startReturn(args),
  },
  product: {
    assertNoDualWrite: (args) => require("../productSot").assertNoDualWrite(args.targets),
  },
};

function boundMethods() {
  return Object.entries(ENGINES).flatMap(([engine, methods]) => Object.keys(methods).map((method) => `${engine}.${method}`));
}

function invoke({ engine, method, args = {}, actorId = null } = {}) {
  const actor = String(actorId || "").trim();
  if (!actor) return { ok: false, code: "ACTOR_REQUIRED", engine, method, orchestrator: false, decides: false };
  const fn = ENGINES[engine]?.[method];
  if (!fn) return { ok: false, code: "ENGINE_METHOD_UNKNOWN", engine, method, orchestrator: false, decides: false };
  try {
    require("../securityLog").logSecurityEvent({
      type: "software_gate",
      success: true,
      detail: { engine, method, actorId: actor },
    });
  } catch {
    /* logging does not decide the call */
  }
  try {
    const result = fn(args);
    return {
      ok: result?.ok !== false,
      code: result?.code || "OK",
      engine,
      method,
      actorId: actor,
      result,
      orchestrator: false,
      decides: false,
    };
  } catch (err) {
    return {
      ok: false,
      code: err.code || "ENGINE_FAULT",
      engine,
      method,
      actorId: actor,
      orchestrator: false,
      decides: false,
    };
  }
}

module.exports = { invoke, boundMethods, ENGINES };
