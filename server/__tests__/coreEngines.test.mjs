import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const engines = require("../lib/commerce/coreEngines.js");
const { selectTransportCost } = require("../lib/commerce/pricingPolicy.js");

describe("twelve local commerce engines", () => {
  it("calls every engine and leaves commerce closed", () => {
    const chain = engines.runChain({ actorId: "pusat", sku: "BZ-SYN", country: "DE", currency: "EUR" });
    expect(chain.executed).toBe(true);
    expect(chain.commercialReady).toBe(false);
    expect(chain.orderCreated).toBe(false);
    expect(chain.paymentCaptured).toBe(false);
    expect(chain.shipmentCreated).toBe(false);
    expect(chain.salesEnabled).toBe(false);
    expect(chain.live).toBe(false);
    expect(Object.keys(chain.engines)).toEqual([...engines.ENGINE_IDS]);
    expect(chain.engines.order.code).toBe("SALES_CLOSED");
    expect(chain.engines.order.orderCreated).toBe(false);
    expect(chain.engines.payment.code).toBe("FIAT_ACCEPTED");
    expect(chain.engines.payment.captured).toBe(false);
    expect(chain.engines.market.vatOfficial).toBe(false);
    expect(chain.engines.market.vatRate).toBeNull();
    expect(chain.engines.shipping.shippingCost).toBeNull();
    expect(chain.engines.shipping.live).toBe(false);
    expect(chain.engines.supplier.purchased).toBe(false);
    expect(chain.engines.notification.sent).toBe(false);
    expect(chain.engines.returns.labelIssued).toBe(false);
    expect(chain.engines.returns.customerRefund).toBeNull();
    expect(chain.engines.returns.supplierCredit).toBeNull();
    expect(chain.engines.reporting.synthetic).toBe(true);
    expect(chain.engines.reporting.liveMetrics).toBeNull();
    expect(chain.engines.product.price).toBeNull();
    expect(chain.engines.product.categories).toBe(50);
  });

  it("blocks an unknown actor, a sensitive buy, and a repeated key", () => {
    const unknown = engines.callEngine("inventory", { actorId: "not_an_agent", action: "buy", sensitive: true });
    expect(unknown.code).toBe("UNKNOWN_IDENTITY");
    const buy = engines.callEngine("inventory", { actorId: "stock_ai", action: "buy", sensitive: true, idempotencyKey: "buy-1" });
    expect(buy.code).toBe("HUMAN_GATE_REQUIRED");
    expect(buy.performed).toBe(false);
    const replay = engines.callEngine("inventory", { actorId: "stock_ai", action: "buy", sensitive: true, idempotencyKey: "buy-1" });
    expect(replay.replay).toBe(true);
    expect(replay.code).toBe("HUMAN_GATE_REQUIRED");
    const late = engines.callEngine("payment", { actorId: "nedim_bey", action: "capture" }, { deadlineMs: Date.now() - 1 });
    expect(late.code).toBe("TIMEOUT");
    expect(late.captured).toBe(false);
    expect(late.paymentCaptured).toBe(false);
    expect(late.moneyMoved).toBe(false);
    expect(late.sandboxConnected).toBe(false);
    expect(late.performed).toBe(false);
    expect(late.live).toBe(false);
    const crypto = engines.callEngine("payment", { actorId: "nedim_bey", currency: "BTC", assetType: "crypto" });
    expect(crypto.code).toBe("REJECTED_CRYPTO_POLICY");
    expect(crypto.captured).toBe(false);
  });

  it("rejects every sensitive commerce action without performing it", () => {
    const cases = [
      { engine: "order", action: "create", permission: "SALES_WRITE", domain: "pusat", proof: { orderCreated: false, paymentAuthorized: false } },
      { engine: "inventory", action: "buy", permission: "STOCK_BUY", domain: "stock_ai", proof: { purchased: false, stockChanged: false } },
      { engine: "supplier", action: "pay", permission: "SUPPLIER_PAY", domain: "stock_ai", proof: { purchased: false } },
      { engine: "payment", action: "capture", permission: "LIVE_PAYMENT", domain: "nedim_bey", proof: { captured: false, paymentCaptured: false, moneyMoved: false, sandboxConnected: false, cardStored: false } },
      { engine: "shipping", action: "create", permission: "SHIPMENT_CREATE", domain: "pusat", proof: { shipmentCreated: false } },
      { engine: "returns", action: "refund", permission: "CUSTOMER_REFUND", domain: "banu_hanim", proof: { customerRefund: null, supplierCredit: null, labelIssued: false } },
      { engine: "customer", action: "export", permission: "DATA_EXPORT", domain: "banu_hanim", proof: { exported: false } },
    ];
    for (const item of cases) {
      const unknown = engines.callEngine(item.engine, { actorId: "not_an_agent", action: item.action });
      expect(unknown.code).toBe("UNKNOWN_IDENTITY");
      expect(unknown.action).toBe(item.permission);
      expect(unknown.performed).toBe(false);
      expect(unknown.live).toBe(false);
      expect(unknown.salesEnabled).toBe(false);
      const unauthorized = engines.callEngine(item.engine, { actorId: "seo_ai", action: item.action });
      expect(unauthorized.code).toBe("HUMAN_GATE_REQUIRED");
      expect(unauthorized.action).toBe(item.permission);
      expect(unauthorized.performed).toBe(false);
      expect(unauthorized.live).toBe(false);
      expect(unauthorized.salesEnabled).toBe(false);
      const domain = engines.callEngine(item.engine, {
        actorId: item.domain,
        action: item.action,
        idempotencyKey: `sensitive-${item.engine}`,
      });
      expect(domain.code).toBe("HUMAN_GATE_REQUIRED");
      expect(domain.action).toBe(item.permission);
      expect(domain.performed).toBe(false);
      expect(domain.live).toBe(false);
      expect(domain.ok).toBe(false);
      expect(domain.salesEnabled).toBe(false);
      const replay = engines.callEngine(item.engine, {
        actorId: item.domain,
        action: item.action,
        idempotencyKey: `sensitive-${item.engine}`,
      });
      expect(replay.replay).toBe(true);
      expect(replay.code).toBe("HUMAN_GATE_REQUIRED");
      expect(replay.performed).toBe(false);
      expect(replay.live).toBe(false);
      for (const [field, value] of Object.entries(item.proof)) {
        expect(unknown[field]).toBe(value);
        expect(unauthorized[field]).toBe(value);
        expect(domain[field]).toBe(value);
        expect(replay[field]).toBe(value);
      }
    }
    const customerRefund = engines.callEngine("customer", { actorId: "banu_hanim", action: "refund" });
    expect(customerRefund.action).toBe("CUSTOMER_REFUND");
    expect(customerRefund.code).toBe("HUMAN_GATE_REQUIRED");
    expect(customerRefund.performed).toBe(false);
    expect(customerRefund.customerRefund).toBeNull();
    expect(customerRefund.live).toBe(false);
    const closedOrder = engines.callEngine("order", { actorId: "pusat" });
    expect(closedOrder.code).toBe("SALES_CLOSED");
    expect(closedOrder.orderCreated).toBe(false);
    expect(closedOrder.salesEnabled).toBe(false);
    const catalog = engines.callEngine("product", { actorId: "category_ai", sku: "BZ-SYN", action: "publish" });
    expect(catalog.live).toBe(false);
    expect(catalog.price).toBeNull();
    const quote = engines.callEngine("pricing", { actorId: "pricing_ai", action: "publish" });
    expect(quote.live).toBe(false);
    const market = engines.callEngine("market", { actorId: "pusat", country: "DE", action: "connect" });
    expect(market.live).toBe(false);
    expect(market.vatOfficial).toBe(false);
    const notice = engines.callEngine("notification", { actorId: "banu_hanim", action: "send" });
    expect(notice.sent).toBe(false);
    expect(notice.live).toBe(false);
    const report = engines.callEngine("reporting", { actorId: "pusat", action: "export" });
    expect(report.synthetic).toBe(true);
    expect(report.liveMetrics).toBeNull();
    expect(report.production).toBe(false);
  });

  it("uses a verified rate divisor and does not invent one", () => {
    const lane = {
      origin: "DE-WH-1",
      country: "PL",
      zone: "PL-00-001",
      weightKg: 3,
      dimensions: { lengthCm: 40, widthCm: 30, heightCm: 20 },
    };
    const rates = [
      { carrier: "GLS", service: "standard", amount: 0.8, verified: true, suitable: true, volumetricDivisor: 5000, maxWeightKg: 4 },
      { carrier: "DPD", service: "standard", amount: 1.2, verified: true, suitable: true },
    ];
    const selected = selectTransportCost({ ...lane, rates });
    expect(selected.shippingCost).toBe(1.2);
    expect(selected.selected.carrier).toBe("DPD");
    expect(selected.volumetricRule).toBe("NOT_PUBLISHED");
    const priced = selectTransportCost({
      ...lane,
      rates: [{ carrier: "GLS", service: "standard", amount: 0.8, verified: true, suitable: true, volumetricDivisor: 5000, maxWeightKg: 10 }],
    });
    expect(priced.shippingCost).toBe(0.8);
    expect(priced.volumetricKg).toBe(4.8);
    expect(priced.chargeableKg).toBe(4.8);
    expect(priced.volumetricRule).toBe("RATE_DIVISOR");
    expect(priced.live).toBe(false);
  });
});

describe("each commerce engine stays non-live", () => {
  function trueFlags(value, path, found) {
    if (!value || typeof value !== "object") return found;
    for (const [key, child] of Object.entries(value)) {
      const name = String(key);
      const here = path ? `${path}.${name}` : name;
      if ((name === "live" || name.startsWith("live") || name === "enabled" || name === "active" || name === "salesEnabled") && child === true) {
        found.push(here);
      }
      if (child && typeof child === "object") trueFlags(child, here, found);
    }
    return found;
  }

  function chainFor(engineId) {
    const chain = engines.runChain({ actorId: "pusat", sku: "BZ-SYN", country: "DE", currency: "EUR" });
    expect(chain.executed).toBe(true);
    expect(chain.live).toBe(false);
    expect(chain.salesEnabled).toBe(false);
    expect(chain.commercialReady).toBe(false);
    expect(chain.orderCreated).toBe(false);
    expect(chain.paymentCaptured).toBe(false);
    expect(chain.shipmentCreated).toBe(false);
    expect(chain.engines[engineId].live).toBe(false);
    expect(trueFlags(chain.engines[engineId], engineId, [])).toEqual([]);
    return chain;
  }

  it("product does not publish a live price", () => {
    const direct = engines.callEngine("product", { actorId: "category_ai", sku: "BZ-SYN" });
    const chain = chainFor("product");
    expect(direct.code).toBe("CATALOG_FRAME_READY");
    expect(direct.live).toBe(false);
    expect(direct.price).toBeNull();
    expect(chain.engines.product.price).toBeNull();
    expect(trueFlags(direct, "product", [])).toEqual([]);
  });

  it("order does not create an order", () => {
    const direct = engines.callEngine("order", { actorId: "pusat" });
    const chain = chainFor("order");
    expect(direct.code).toBe("SALES_CLOSED");
    expect(direct.live).toBe(false);
    expect(direct.orderCreated).toBe(false);
    expect(direct.moneyMoved).toBe(false);
    expect(direct.salesEnabled).toBe(false);
    expect(chain.engines.order.orderCreated).toBe(false);
    expect(trueFlags(direct, "order", [])).toEqual([]);
  });

  it("inventory does not buy or change stock", () => {
    const direct = engines.callEngine("inventory", { actorId: "stock_ai", quantity: 4 });
    const chain = chainFor("inventory");
    expect(direct.live).toBe(false);
    expect(direct.purchased).toBe(false);
    expect(direct.stockChanged).toBe(false);
    expect(direct.sellable).toBe(false);
    expect(direct.liveSupplierApi).toBe(false);
    expect(chain.engines.inventory.purchased).toBe(false);
    expect(chain.engines.inventory.stockChanged).toBe(false);
    expect(trueFlags(direct, "inventory", [])).toEqual([]);
  });

  it("customer does not export data or refund", () => {
    const direct = engines.callEngine("customer", { actorId: "banu_hanim", intent: "faq" });
    const chain = chainFor("customer");
    expect(direct.live).toBe(false);
    expect(direct.exported).toBe(false);
    expect(direct.customerRefund).toBeNull();
    expect(direct.sent).toBe(false);
    expect(direct.notificationSent).toBe(false);
    expect(direct.liveMailbox).toBe(false);
    expect(chain.engines.customer.exported).toBe(false);
    expect(chain.engines.customer.customerRefund).toBeNull();
    expect(trueFlags(direct, "customer", [])).toEqual([]);
  });

  it("market does not treat a snapshot as official", () => {
    const direct = engines.callEngine("market", { actorId: "pusat", country: "DE" });
    const chain = chainFor("market");
    expect(direct.code).toBe("MARKET_FRAME_READY");
    expect(direct.live).toBe(false);
    expect(direct.vatOfficial).toBe(false);
    expect(direct.vatRate).toBeNull();
    expect(chain.engines.market.vatOfficial).toBe(false);
    expect(chain.engines.market.live).toBe(false);
    expect(trueFlags(direct, "market", [])).toEqual([]);
  });

  it("supplier does not purchase", () => {
    const direct = engines.callEngine("supplier", { actorId: "stock_ai" });
    const chain = chainFor("supplier");
    expect(direct.code).toBe("SUPPLIER_DATA_UNKNOWN");
    expect(direct.live).toBe(false);
    expect(direct.purchased).toBe(false);
    expect(direct.stockChanged).toBe(false);
    expect(direct.price).toBeNull();
    expect(chain.engines.supplier.purchased).toBe(false);
    expect(trueFlags(direct, "supplier", [])).toEqual([]);
  });

  it("pricing does not write a live price", () => {
    const direct = engines.callEngine("pricing", { actorId: "pricing_ai" });
    const chain = chainFor("pricing");
    expect(direct.live).toBe(false);
    expect(direct.livePriceWrite).toBe(false);
    expect(chain.engines.pricing.livePriceWrite).toBe(false);
    expect(trueFlags(direct, "pricing", [])).toEqual([]);
  });

  it("payment does not capture", () => {
    const direct = engines.callEngine("payment", { actorId: "nedim_bey", currency: "EUR", assetType: "fiat" });
    const chain = chainFor("payment");
    expect(direct.code).toBe("FIAT_ACCEPTED");
    expect(direct.live).toBe(false);
    expect(direct.captured).toBe(false);
    expect(direct.paymentCaptured).toBe(false);
    expect(direct.cardStored).toBe(false);
    expect(chain.paymentCaptured).toBe(false);
    expect(chain.engines.payment.captured).toBe(false);
    expect(trueFlags(direct, "payment", [])).toEqual([]);
  });

  it("shipping does not create a shipment", () => {
    const direct = engines.callEngine("shipping", { actorId: "pusat", country: "DE" });
    const chain = chainFor("shipping");
    expect(direct.live).toBe(false);
    expect(direct.shipmentCreated).toBe(false);
    expect(direct.apiConnected).toBe(false);
    expect(direct.shippingCost).toBeNull();
    expect(chain.shipmentCreated).toBe(false);
    expect(chain.engines.shipping.shipmentCreated).toBe(false);
    expect(trueFlags(direct, "shipping", [])).toEqual([]);
  });

  it("returns does not refund the customer", () => {
    const direct = engines.callEngine("returns", { actorId: "banu_hanim" });
    const chain = chainFor("returns");
    expect(direct.live).toBe(false);
    expect(direct.customerRefund).toBeNull();
    expect(direct.customerRefundIssued).toBe(false);
    expect(direct.labelIssued).toBe(false);
    expect(direct.supplierCredit).toBeNull();
    expect(chain.engines.returns.customerRefund).toBeNull();
    expect(chain.engines.returns.labelIssued).toBe(false);
    expect(trueFlags(direct, "returns", [])).toEqual([]);
  });

  it("notification does not send", () => {
    const direct = engines.callEngine("notification", { actorId: "banu_hanim", channel: "EMAIL", event: "SHIPPED" });
    const chain = chainFor("notification");
    expect(direct.live).toBe(false);
    expect(direct.sent).toBe(false);
    expect(direct.notificationSent).toBe(false);
    expect(chain.engines.notification.sent).toBe(false);
    expect(chain.engines.notification.notificationSent).toBe(false);
    expect(trueFlags(direct, "notification", [])).toEqual([]);
  });

  it("reporting stays synthetic", () => {
    const direct = engines.callEngine("reporting", { actorId: "pusat" });
    const chain = chainFor("reporting");
    expect(direct.code).toBe("SYNTHETIC_REPORT");
    expect(direct.live).toBe(false);
    expect(direct.synthetic).toBe(true);
    expect(direct.production).toBe(false);
    expect(direct.liveMetrics).toBeNull();
    expect(chain.engines.reporting.liveMetrics).toBeNull();
    expect(chain.engines.reporting.production).toBe(false);
    expect(trueFlags(direct, "reporting", [])).toEqual([]);
  });
});

describe("ALLOW cannot start the seven sensitive actions", () => {
  const ALLOWED = new Set([
    "SALES_WRITE",
    "STOCK_BUY",
    "SUPPLIER_PAY",
    "LIVE_PAYMENT",
    "SHIPMENT_CREATE",
    "CUSTOMER_REFUND",
    "DATA_EXPORT",
  ]);
  const stock = require("../lib/buzzardNative/core/specialists/stockEngine.js");
  const customer = require("../lib/buzzardNative/core/specialists/banuEngine.js");
  const returns = require("../lib/logistics/v5/returnsEngine.js");
  const orders = require("../lib/commerce/storefrontCatalogAdapter.js");
  const pricing = require("../lib/commerce/pricingPolicy.js");
  const fiat = require("../lib/banking/eu27/fiatPolicy.js");
  const permission = require("../lib/buzzardNative/core/permissionEngine.js");
  const originals = {
    buyStock: stock.buyStock,
    paySupplier: stock.paySupplier,
    refund: customer.refund,
    reply: customer.reply,
    startReturn: returns.startReturn,
    placeOrder: orders.placeOrder,
    selectTransportCost: pricing.selectTransportCost,
    decideAsset: fiat.decideAsset,
    check: permission.check,
  };
  const enginePath = require.resolve("../lib/commerce/coreEngines.js");
  let counts;
  let checks;
  let fresh;

  beforeEach(() => {
    counts = {
      placeOrder: 0,
      buyStock: 0,
      paySupplier: 0,
      decideAsset: 0,
      selectTransportCost: 0,
      refund: 0,
      startReturn: 0,
      reply: 0,
    };
    checks = [];
    orders.placeOrder = () => {
      counts.placeOrder += 1;
      return { code: "RUNNER_CALLED", orderCreated: true };
    };
    stock.buyStock = () => {
      counts.buyStock += 1;
      return { code: "RUNNER_CALLED", purchased: true };
    };
    stock.paySupplier = () => {
      counts.paySupplier += 1;
      return { code: "RUNNER_CALLED", purchased: true };
    };
    fiat.decideAsset = () => {
      counts.decideAsset += 1;
      return { code: "RUNNER_CALLED", captured: true };
    };
    pricing.selectTransportCost = () => {
      counts.selectTransportCost += 1;
      return { code: "RUNNER_CALLED", shipmentCreated: true };
    };
    customer.refund = () => {
      counts.refund += 1;
      return { code: "RUNNER_CALLED", customerRefund: 1 };
    };
    customer.reply = () => {
      counts.reply += 1;
      return { code: "RUNNER_CALLED", sent: true };
    };
    returns.startReturn = () => {
      counts.startReturn += 1;
      return { code: "RUNNER_CALLED", labelIssued: true, customerRefund: 1 };
    };
    delete require.cache[enginePath];
    fresh = require("../lib/commerce/coreEngines.js");
    permission.check = (actorId, perm) => {
      if (ALLOWED.has(perm)) {
        checks.push({ actorId, perm, code: "ALLOW", ok: true });
        return { ok: true, code: "ALLOW", agentId: actorId, perm };
      }
      return originals.check(actorId, perm);
    };
  });

  afterEach(() => {
    permission.check = originals.check;
    orders.placeOrder = originals.placeOrder;
    stock.buyStock = originals.buyStock;
    stock.paySupplier = originals.paySupplier;
    fiat.decideAsset = originals.decideAsset;
    pricing.selectTransportCost = originals.selectTransportCost;
    customer.refund = originals.refund;
    customer.reply = originals.reply;
    returns.startReturn = originals.startReturn;
    delete require.cache[enginePath];
  });

  function expectAllowClosed(engine, action, permissionName, proof) {
    const before = { ...counts };
    const mark = checks.length;
    const result = fresh.callEngine(engine, { actorId: "pusat", action });
    const seen = checks.slice(mark);
    expect(seen).toEqual([{ actorId: "pusat", perm: permissionName, code: "ALLOW", ok: true }]);
    expect(result.code).toBe("LIVE_ACTION_CLOSED");
    expect(result.action).toBe(permissionName);
    expect(result.performed).toBe(false);
    expect(result.live).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.salesEnabled).toBe(false);
    for (const [field, value] of Object.entries(proof)) expect(result[field]).toBe(value);
    for (const [name, value] of Object.entries(before)) expect(counts[name]).toBe(value);
    const runnerAudits = fresh.auditTrail().filter((entry) => entry.code !== "LIVE_ACTION_CLOSED");
    expect(runnerAudits).toEqual([]);
    return result;
  }

  it("does not place an order after ALLOW", () => {
    expectAllowClosed("order", "create", "SALES_WRITE", { orderCreated: false, paymentAuthorized: false });
    expect(counts.placeOrder).toBe(0);
  });

  it("does not buy stock after ALLOW", () => {
    expectAllowClosed("inventory", "buy", "STOCK_BUY", { purchased: false, stockChanged: false });
    expect(counts.buyStock).toBe(0);
  });

  it("does not pay a supplier after ALLOW", () => {
    expectAllowClosed("supplier", "pay", "SUPPLIER_PAY", { purchased: false });
    expect(counts.paySupplier).toBe(0);
  });

  it("does not capture a payment after ALLOW", () => {
    expectAllowClosed("payment", "capture", "LIVE_PAYMENT", {
      captured: false,
      paymentCaptured: false,
      moneyMoved: false,
      sandboxConnected: false,
      cardStored: false,
    });
    expect(counts.decideAsset).toBe(0);
  });

  it("does not pay after ALLOW", () => {
    expectAllowClosed("payment", "pay", "LIVE_PAYMENT", {
      captured: false,
      paymentCaptured: false,
      moneyMoved: false,
      sandboxConnected: false,
      cardStored: false,
    });
    expect(counts.decideAsset).toBe(0);
  });

  it("does not charge after ALLOW", () => {
    expectAllowClosed("payment", "charge", "LIVE_PAYMENT", {
      captured: false,
      paymentCaptured: false,
      moneyMoved: false,
      sandboxConnected: false,
      cardStored: false,
    });
    expect(counts.decideAsset).toBe(0);
  });

  it("does not create a shipment after ALLOW", () => {
    expectAllowClosed("shipping", "create", "SHIPMENT_CREATE", { shipmentCreated: false });
    expect(counts.selectTransportCost).toBe(0);
  });

  it("does not refund a customer after ALLOW", () => {
    expectAllowClosed("customer", "refund", "CUSTOMER_REFUND", { customerRefund: null });
    expectAllowClosed("returns", "refund", "CUSTOMER_REFUND", {
      customerRefund: null,
      supplierCredit: null,
      labelIssued: false,
    });
    expect(counts.refund).toBe(0);
    expect(counts.startReturn).toBe(0);
  });

  it("does not export customer data after ALLOW", () => {
    expectAllowClosed("customer", "export", "DATA_EXPORT", { exported: false });
    expect(counts.reply).toBe(0);
    expect(counts.refund).toBe(0);
  });
});

describe("EU-27 payment catalogue stays unverified", () => {
  const currencies = {
    AT: "EUR", BE: "EUR", BG: "EUR", HR: "EUR", CY: "EUR", CZ: "CZK", DK: "DKK",
    EE: "EUR", FI: "EUR", FR: "EUR", DE: "EUR", GR: "EUR", HU: "HUF", IE: "EUR",
    IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR", PL: "PLN",
    PT: "EUR", RO: "RON", SK: "EUR", SI: "EUR", ES: "EUR", SE: "SEK",
  };

  function closed(result) {
    expect(result.live).toBe(false);
    expect(result.captured).toBe(false);
    expect(result.paymentCaptured).toBe(false);
    expect(result.cardStored).toBe(false);
    expect(result.moneyMoved).toBe(false);
    expect(result.provider).toBeNull();
    expect(result.sandboxConnected).toBe(false);
    expect(result.salesEnabled).toBe(false);
  }

  it("lists every member and keeps its currency", () => {
    expect(Object.keys(currencies)).toHaveLength(27);
    for (const [country, currency] of Object.entries(currencies)) {
      const listed = engines.callEngine("payment", { actorId: "nedim_bey", action: "methods", country });
      expect(listed.code).toBe("METHOD_CATALOGUE");
      expect(listed.country).toBe(country);
      expect(listed.currency).toBe(currency);
      expect(listed.methods.length).toBeGreaterThan(0);
      expect(listed.methods.every((method) => method.verificationStatus === "UNVERIFIED" && method.live === false && method.licenseVerified === false)).toBe(true);
      expect(listed.methods.find((method) => method.methodId === "licensed_local_provider").localSchemeName).toBeNull();
      closed(listed);
    }
  });

  it("matches a country only with its own currency", () => {
    const matched = engines.callEngine("payment", {
      actorId: "nedim_bey",
      action: "route",
      country: "PL",
      currency: "PLN",
      methodId: "sepa_credit_transfer",
    });
    expect(matched.currency).toBe("PLN");
    expect(matched.expectedCurrency).toBe("PLN");
    const mismatched = [
      ["DE", "PLN", "EUR"],
      ["PL", "EUR", "PLN"],
      ["SE", "EUR", "SEK"],
      ["HU", "EUR", "HUF"],
      ["CZ", "EUR", "CZK"],
      ["DK", "EUR", "DKK"],
      ["RO", "EUR", "RON"],
    ];
    for (const [country, currency, expected] of mismatched) {
      const result = engines.callEngine("payment", {
        actorId: "nedim_bey",
        action: "route",
        country,
        currency,
        methodId: "sepa_credit_transfer",
      });
      expect(result.code).toBe("CURRENCY_COUNTRY_MISMATCH");
      expect(result.expectedCurrency).toBe(expected);
      expect(result.assetDecision).toBe("FIAT_ACCEPTED");
      closed(result);
    }
  });

  it("rejects unverified methods and finds no provider", () => {
    for (const [country, currency] of Object.entries(currencies)) {
      const result = engines.callEngine("payment", {
        actorId: "nedim_bey",
        action: "route",
        country,
        currency,
        methodId: "sepa_credit_transfer",
        candidates: [{
          id: "injected-fixture",
          fixture: true,
          live: false,
          licenseStatus: "LICENSE_VERIFIED",
          contractStatus: "CONTRACT_VERIFIED",
          connectorStatus: "SANDBOX_VERIFIED",
          countryCode: country,
          currencies: [currency],
          methods: ["sepa_credit_transfer"],
          screening: "CLEAR_FIXTURE",
        }],
      });
      expect(result.code).toBe("METHOD_NOT_VERIFIED");
      expect(result.methodCode).toBe("METHOD_NOT_VERIFIED");
      expect(result.verificationStatus).toBe("UNVERIFIED");
      expect(result.assetDecision).toBe("FIAT_ACCEPTED");
      expect(result.code).not.toBe("SANDBOX_ROUTE");
      closed(result);
    }
  });

  it("rejects pay and charge before any capture", () => {
    for (const action of ["pay", "charge"]) {
      const denied = engines.callEngine("payment", { actorId: "nedim_bey", action, currency: "EUR", country: "DE" });
      expect(denied.code).toBe("HUMAN_GATE_REQUIRED");
      expect(denied.action).toBe("LIVE_PAYMENT");
      expect(denied.code).not.toBe("FIAT_ACCEPTED");
      expect(denied.captured).toBe(false);
      expect(denied.paymentCaptured).toBe(false);
      expect(denied.moneyMoved).toBe(false);
      expect(denied.sandboxConnected).toBe(false);
      expect(denied.performed).toBe(false);
      expect(denied.live).toBe(false);
      expect(denied.salesEnabled).toBe(false);
      const unknown = engines.callEngine("payment", { actorId: "not_an_agent", action, currency: "EUR", country: "DE" });
      expect(unknown.code).toBe("UNKNOWN_IDENTITY");
      expect(unknown.action).toBe("LIVE_PAYMENT");
      expect(unknown.captured).toBe(false);
      expect(unknown.paymentCaptured).toBe(false);
      expect(unknown.moneyMoved).toBe(false);
      expect(unknown.sandboxConnected).toBe(false);
      expect(unknown.performed).toBe(false);
      expect(unknown.live).toBe(false);
    }
  });

  it("keeps every capture response field false", () => {
    const denied = engines.callEngine("payment", {
      actorId: "nedim_bey",
      action: "capture",
      currency: "EUR",
      country: "DE",
      idempotencyKey: "capture-fields",
    });
    const replay = engines.callEngine("payment", {
      actorId: "nedim_bey",
      action: "capture",
      currency: "EUR",
      country: "DE",
      idempotencyKey: "capture-fields",
    });
    const late = engines.callEngine("payment", { actorId: "nedim_bey", action: "capture" }, { deadlineMs: Date.now() - 1 });
    const unknown = engines.callEngine("payment", { actorId: "not_an_agent", action: "capture", currency: "EUR" });
    for (const result of [denied, replay, late, unknown]) {
      expect(result.captured).toBe(false);
      expect(result.paymentCaptured).toBe(false);
      expect(result.moneyMoved).toBe(false);
      expect(result.sandboxConnected).toBe(false);
      expect(result.performed).toBe(false);
      expect(result.live).toBe(false);
      expect(result.ok).toBe(false);
    }
    expect(denied.code).toBe("HUMAN_GATE_REQUIRED");
    expect(replay.code).toBe("HUMAN_GATE_REQUIRED");
    expect(replay.replay).toBe(true);
    expect(late.code).toBe("TIMEOUT");
    expect(unknown.code).toBe("UNKNOWN_IDENTITY");
  });

  it("returns NO_ELIGIBLE_PROVIDER when a verified method still has no real provider", () => {
    const payments = require("../lib/banking/eu27/payments.js");
    const routingPath = require.resolve("../lib/banking/eu27/routing.js");
    const enginePath = require.resolve("../lib/commerce/coreEngines.js");
    const original = payments.isVerifiedMethod;
    payments.isVerifiedMethod = () => ({ ok: true, method: { verificationStatus: "VERIFIED", live: false, licenseVerified: true } });
    delete require.cache[routingPath];
    delete require.cache[enginePath];
    try {
      const fresh = require("../lib/commerce/coreEngines.js");
      const result = fresh.callEngine("payment", {
        actorId: "nedim_bey",
        action: "route",
        country: "DE",
        currency: "EUR",
        methodId: "sepa_credit_transfer",
        candidates: [{
          id: "sandbox-fixture",
          fixture: true,
          live: false,
          licenseStatus: "LICENSE_VERIFIED",
          contractStatus: "CONTRACT_VERIFIED",
          connectorStatus: "SANDBOX_VERIFIED",
          countryCode: "DE",
          currencies: ["EUR"],
          methods: ["sepa_credit_transfer"],
          screening: "CLEAR_FIXTURE",
        }],
      });
      expect(result.code).toBe("NO_ELIGIBLE_PROVIDER");
      expect(result.provider).toBeNull();
      expect(result.sandboxConnected).toBe(false);
      expect(result.captured).toBe(false);
      expect(result.paymentCaptured).toBe(false);
      expect(result.moneyMoved).toBe(false);
      expect(result.live).toBe(false);
      expect(result.code).not.toBe("SANDBOX_ROUTE");
    } finally {
      payments.isVerifiedMethod = original;
      delete require.cache[routingPath];
      delete require.cache[enginePath];
    }
  });

  it("does not treat FIAT_ACCEPTED as a capture", () => {
    const decision = engines.callEngine("payment", { actorId: "nedim_bey", currency: "EUR", assetType: "fiat" });
    expect(decision.code).toBe("FIAT_ACCEPTED");
    expect(decision.assetDecision).toBe("FIAT_ACCEPTED");
    expect(decision.code).not.toBe("NO_ELIGIBLE_PROVIDER");
    closed(decision);
  });
});
