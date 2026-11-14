/**
 * Local contract for the ten Buzzard modules.
 * Synthetic records only. It does not open the development database,
 * move money, buy stock, create a shipment, or mark any module live.
 */
const fs = require("fs");
const path = require("path");
const { snapshot, buyStock } = require("../commerce/engineRegistry");
const { evaluateOffer, MIN_NET_PROFIT_EUR } = require("../commerce/pricingPolicy");
const { supplierSnapshot, foldTracking, memoryWall, crashIsolation } = require("../commerce/workflowChain");
const { list, product, status: pimStatus } = require("../commerce/pimReadOnlyAdapter");
const { validateHierarchy } = require("../commerce/categoryHierarchy");
const { decideAsset, requestPolicyChange } = require("../banking/eu27/fiatPolicy");
const { quoteRate } = require("../banking/eu27/fx");
const { registryComplete } = require("../banking/eu27/inventory");
const { getMarket, EU_COUNTRY_CODES } = require("../../core/marketEngineRegistry");
const { SEED_IDS, getAgentExact, assignVoice } = require("../buzzardNative/core/identityRegistry");
const { createApprovalCenter } = require("../pusat/humanApproval");
const { createDurableTaskQueue } = require("../pusat/durableTaskQueue");
const { assessVoice } = require("../voice/voiceReadiness");
const { evaluateEgress } = require("../security/egressPolicy");
const { isSalesEnabled } = require("../salesMode");
const { applyCustomerRefund } = require("../finance/unifiedPricing");
const { handle } = require("../customer/banuDesk");
const { placeOrder } = require("../commerce/storefrontCatalogAdapter");
const { notifyCustomer } = require("../logistics/v5/notifyStub");
const { startReturn } = require("../logistics/v5/returnsEngine");

const CHARACTERS = Object.freeze(["sinan_bey", "mira", "leon", "amelia", "adrian", "zeynep_hanim"]);
const FORBIDDEN_DB = path.resolve("/workspace/server/data/buzzard.db");

function assertIsolatedPath(file) {
  const resolved = path.resolve(file);
  if (resolved === FORBIDDEN_DB || path.basename(resolved) === "buzzard.db") {
    throw new Error("DEV_DB_FORBIDDEN");
  }
  return resolved;
}

function bench(fn) {
  const samples = [];
  for (let i = 0; i < 50; i += 1) {
    const start = process.hrtime.bigint();
    fn();
    samples.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return { samples: 50, avgMs: Number(avg.toFixed(3)), maxMs: Number(Math.max(...samples).toFixed(3)), production: false };
}

function runJourney(dir) {
  const root = assertIsolatedPath(dir);
  fs.mkdirSync(root, { recursive: true });
  const search = list({ locale: "de", q: "brems" });
  const detail = product("syn-pad", "de");
  const missingPrice = detail.price === "UNKNOWN"
    ? { ok: false, code: "MISSING_PRICE", invented: false, orderCreated: false }
    : { ok: false, code: "CATALOG_PRICE_NOT_TRUSTED", invented: false, orderCreated: false };
  const fixture = evaluateOffer({
    offerPrice: 20,
    supplierCost: 8,
    shippingCost: 2,
    marketplaceFee: 1,
    paymentFee: 0,
    vatOnFees: 0,
    returnReserve: 0.5,
    vatAmount: 0,
    vatVerified: true,
    comparableMarketPrice: 30,
    category: "other",
  });
  const inventory = supplierSnapshot({ previousQty: 4, payload: {} });
  const timeout = supplierSnapshot({ previousQty: 4, timedOut: true });
  const stockBuy = buyStock();
  const payment = {
    eur: decideAsset({ currency: "EUR" }),
    btc: decideAsset({ currency: "BTC", assetType: "crypto" }),
    eth: decideAsset({ currency: "ETH", assetType: "crypto" }),
    usdt: decideAsset({ currency: "USDT", assetType: "crypto" }),
    usdc: decideAsset({ currency: "USDC", assetType: "crypto" }),
    cbdc: decideAsset({ currency: "EUR", assetType: "cbdc" }),
    digitalEuro: decideAsset({ currency: "EUR", assetType: "digital_euro" }),
    unknown: decideAsset({ currency: "ZZZ" }),
  };
  const fx = quoteRate({ base: "EUR", quote: "PLN" });
  const identity = quoteRate({ base: "EUR", quote: "EUR" });
  const tracking = foldTracking([{ code: "delivered" }, { code: "pickup" }]);
  const carrier = tracking;
  const refund = applyCustomerRefund({ estimatedProfit: fixture.profit, refund: 1 });
  const queuePath = assertIsolatedPath(path.join(root, "queue.sqlite"));
  const first = createDurableTaskQueue({ dbPath: queuePath });
  const task = first.enqueue({
    title: "synthetic journey",
    idempotencyKey: "syn-chain-1",
    assigneeId: "sinan_bey",
    kind: "THINK",
    input: { orderCreated: false },
  });
  const duplicate = first.enqueue({
    title: "synthetic journey",
    idempotencyKey: "syn-chain-1",
    assigneeId: "sinan_bey",
  });
  const hostile = first.enqueue({
    title: "quoted key",
    idempotencyKey: "'; DROP TABLE orch_tasks;--",
    assigneeId: "esat_bey",
  });
  const taskId = task.task && task.task.id;
  first.close();
  const reopened = createDurableTaskQueue({ dbPath: queuePath });
  const restored = reopened.get(taskId);
  reopened.close();
  const approval = createApprovalCenter({ dbPath: assertIsolatedPath(path.join(root, "approvals.sqlite")) });
  const stockApproval = approval.submit({
    action: "STOCK_BUY",
    requestedBy: "stock_ai",
    reason: "synthetic",
    payload: { taskId: "syn-chain-1" },
  });
  const lowExport = approval.submit({
    action: "DATA_EXPORT",
    requestedBy: "esat_bey",
    reason: "bypass",
    risk: "LOW",
  });
  approval.close();
  const desk = handle({ text: "Bestellung SYN-CHAIN-1", locale: "de", facts: { orderId: "SYN-CHAIN-1" } });
  const order = placeOrder();
  const notice = notifyCustomer({ channel: "EMAIL", event: "ORDER_UPDATE", verified: false });
  const returned = startReturn({ shipmentId: order.orderCreated ? "SYN-CHAIN-1" : "" });

  return {
    correlationId: "SYN-CHAIN-1",
    synthetic: true,
    live: false,
    orderCreated: false,
    moneyMoved: false,
    shipmentCreated: false,
    supplierPurchased: false,
    steps: {
      customer: {
        invoked: "banuDesk.handle",
        intent: desk.intent || null,
        code: desk.code || null,
        sent: desk.sent === true,
        liveMailbox: desk.liveMailbox === true,
        exported: false,
        orderCreated: false,
      },
      search: { ok: search.ok === true && search.items.length === 1, code: search.code, openedDevDb: search.openedDevDb },
      pricing: {
        ok: missingPrice.code === "MISSING_PRICE" && fixture.ok === true && fixture.salesEnabled === false && fixture.profit >= MIN_NET_PROFIT_EUR,
        catalog: missingPrice,
        fixtureAccepted: fixture.ok,
        salesEnabled: fixture.salesEnabled,
        inventedCatalogPrice: false,
      },
      inventory: {
        ok: false,
        qtyHeldUnknown: inventory.qty === "UNKNOWN" && inventory.invented === false,
        code: inventory.code,
        stockVerified: false,
      },
      order: {
        invoked: "storefrontCatalogAdapter.placeOrder",
        code: order.code,
        orderCreated: order.orderCreated === true,
        moneyMoved: order.moneyMoved === true,
        sales: isSalesEnabled() ? "ENV_ENABLED_REFUSED" : "CLOSED",
        status: order.orderCreated ? "FAILED" : "BLOCKED",
      },
      payment: {
        ok: payment.eur.ok === true
          && payment.btc.code === "REJECTED_CRYPTO_POLICY"
          && payment.eth.code === "REJECTED_CRYPTO_POLICY"
          && payment.usdt.code === "REJECTED_CRYPTO_POLICY"
          && payment.usdc.code === "REJECTED_CRYPTO_POLICY"
          && payment.cbdc.code === "REJECTED_CBDC_POLICY"
          && payment.digitalEuro.code === "REJECTED_CBDC_POLICY"
          && payment.unknown.code === "REJECTED_UNKNOWN_ASSET"
          && fx.code === "FX_RATE_UNKNOWN"
          && fx.invented === false
          && identity.code === "IDENTITY_RATE",
        moneyMoved: false,
      },
      supplier: {
        ok: stockBuy.code === "HUMAN_GATE_REQUIRED" && timeout.code === "SUPPLIER_TIMEOUT" && timeout.bought === false && timeout.qty === 4,
        purchased: false,
      },
      tracking: { ok: carrier.status === "PICKED_UP" && carrier.live === false, shipmentCreated: false },
      notification: {
        invoked: "notifyCustomer",
        sent: notice.sent === true,
        live: notice.live === true,
        reason: notice.reason,
        status: notice.sent ? "FAILED" : "BLOCKED",
      },
      returns: {
        invoked: "returnsEngine.startReturn",
        state: returned.state,
        labelIssued: returned.labelIssued === true,
        live: returned.live === true,
        customerRefundIssued: returned.customerRefundIssued === true,
        status: returned.labelIssued || returned.live || returned.customerRefundIssued || order.orderCreated ? "FAILED" : "BLOCKED",
        code: order.orderCreated ? "ORDER_PRESENT" : "NO_ORDER",
      },
      refund: {
        ok: refund.supplierReimbursementAssumed === false && refund.supplierReimbursement === null && refund.customerRefund === null && refund.refunded === false,
        moneyMoved: false,
      },
    },
    queue: {
      ok: task.ok === true && duplicate.duplicate === true && hostile.ok === true && restored && restored.id === taskId,
      recoveredAfterRestart: Boolean(restored),
    },
    approval: {
      stockStatus: stockApproval.item ? stockApproval.item.status : null,
      stockAuto: stockApproval.auto === true,
      exportStatus: lowExport.item ? lowExport.item.status : null,
      exportAuto: lowExport.auto === true,
      exportCode: lowExport.code || null,
    },
    detailPrice: detail.price,
    supplierCostExposed: JSON.stringify(search).includes("12.34"),
  };
}

function moduleReport(id, evidence) {
  return {
    id,
    ...evidence,
    liveVerified: false,
    productionReady: false,
  };
}

function runProgram({ dir, writeCheckpoints = false, checkpointRoot = null } = {}) {
  const started = process.hrtime.bigint();
  const journey = runJourney(dir);
  const engines = snapshot();
  const hierarchy = validateHierarchy();
  const registry = registryComplete();
  const de = getMarket("DE");
  const fr = getMarket("FR");
  const voice = assessVoice();
  const characters = CHARACTERS.map((id) => {
    const agent = getAgentExact(id);
    return {
      id,
      present: Boolean(agent),
      cloneAuthorized: agent ? agent.voice_profile.cloneAuthorized : null,
    };
  });
  const voiceCopy = assignVoice({ actorId: "pusat", fromId: "sinan_bey", toId: "mira" });
  const policyChange = requestPolicyChange({ actorId: "esat_bey", actorKind: "ai", humanApproval: true });
  const egress = evaluateEgress({ destinationUrl: "https://api.openai.com/v1/models" });
  const memory = memoryWall();
  const crash = crashIsolation();
  const pim = pimStatus();
  const traversal = product("../buzzard.db", "de");
  const injected = list({ locale: "<script>", q: "x" });
  const performance = {
    search: bench(() => list({ locale: "de", q: "brems" })),
    pricing: bench(() =>
      evaluateOffer({
        offerPrice: 20,
        supplierCost: 8,
        shippingCost: 2,
        marketplaceFee: 1,
        paymentFee: 0,
        returnReserve: 0.5,
        vatAmount: 0,
        vatVerified: true,
        comparableMarketPrice: 30,
        category: "other",
      }),
    ),
    production: false,
  };
  const modules = [
    moduleReport("core", {
      implementation: engines.count === 11 && journey.queue.ok ? "EXECUTED" : "FAILED",
      engines: engines.count,
      anyLive: engines.anyLive,
    }),
    moduleReport("ecommerce", {
      implementation: journey.steps.order.status === "BLOCKED" && journey.steps.customer.sent === false ? "EXECUTED" : "FAILED",
      sales: journey.steps.order.sales,
      orderCreated: journey.steps.order.orderCreated,
    }),
    moduleReport("council", {
      implementation: SEED_IDS.length === 17 && memory.ok && crash.ok && journey.approval.stockStatus === "WAITING_APPROVAL" ? "EXECUTED" : "FAILED",
      seedIds: SEED_IDS.length,
      approval: "BLOCKED_APPROVAL",
      memoryIsolated: memory.ok,
      crashIsolated: crash.ok,
    }),
    moduleReport("catalog", {
      implementation: pim.architecture === "PIM_ARCHITECTURE_READY" && hierarchy.count === 50 ? "EXECUTED" : "FAILED",
      pimLive: pim.liveData,
      taxonomy: hierarchy.subcategoryStatus,
      price: journey.detailPrice,
      traversalOpenedDevDb: traversal.openedDevDb === true,
    }),
    moduleReport("eu27", {
      implementation: EU_COUNTRY_CODES.size === 27 ? "EXECUTED" : "FAILED",
      external: registry.complete ? "FAILED" : "BLOCKED_EXTERNAL",
      registry: registry.code,
      incompleteCountries: registry.countries.filter((row) => !row.complete).map((row) => row.countryCode),
      vatDe: de && de.vat ? de.vat.standardRate : null,
      vatFr: fr && fr.vat ? fr.vat.standardRate : null,
    }),
    moduleReport("pricing", {
      implementation: journey.steps.pricing.ok && journey.steps.payment.ok ? "EXECUTED" : "FAILED",
      minNetProfitEur: MIN_NET_PROFIT_EUR,
      approval: "BLOCKED_APPROVAL",
    }),
    moduleReport("logistics", {
      implementation: journey.steps.supplier.ok && journey.steps.tracking.ok && journey.shipmentCreated === false ? "EXECUTED" : "FAILED",
      external: "BLOCKED_EXTERNAL",
      liveCarrier: false,
    }),
    moduleReport("security", {
      implementation: egress.allowed === false && policyChange.ok === false && injected.code === "MISSING_TRANSLATION" ? "EXECUTED" : "FAILED",
      egress: egress.code,
      policyChange: policyChange.code,
    }),
    moduleReport("voice", {
      implementation: characters.every((row) => row.present && row.cloneAuthorized === false) && voiceCopy.ok === false ? "EXECUTED" : "FAILED",
      external: voice.status === "BLOCKED" ? "BLOCKED_EXTERNAL" : voice.status,
      liveCalls: voice.liveCalls,
      characters,
    }),
    moduleReport("live_operations", {
      implementation: "BLOCKED",
      approval: "BLOCKED_APPROVAL",
      external: "BLOCKED_EXTERNAL",
      contract: "CONTRACT_REQUIRED",
    }),
  ];
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const report = {
    schema: "buzzard.ten-module-program.v1",
    recordedAt: new Date().toISOString(),
    cursorRunsContinuously: false,
    liveVerified: false,
    productionReady: false,
    sales: isSalesEnabled() ? "ENV_ENABLED_REFUSED" : "CLOSED",
    egressDefault: "DENY",
    orderCreated: journey.orderCreated,
    moneyMoved: journey.moneyMoved,
    shipmentCreated: journey.shipmentCreated,
    supplierPurchased: journey.supplierPurchased,
    openedDevDb: false,
    supplierCostExposed: journey.supplierCostExposed,
    journey,
    modules,
    performance: { ...performance, contractElapsedMs: Number(elapsedMs.toFixed(3)), heapMb: Number((process.memoryUsage().heapUsed / 1048576).toFixed(2)) },
    nextTask: "HUMAN_REVIEW_AND_OFFICIAL_REGISTERS",
  };
  if (writeCheckpoints && checkpointRoot) {
    const base = assertIsolatedPath(checkpointRoot);
    fs.mkdirSync(path.join(base, "modules"), { recursive: true });
    fs.writeFileSync(path.join(base, "ten-module-program.json"), JSON.stringify(report, null, 2));
    for (const row of modules) {
      fs.writeFileSync(path.join(base, "modules", `${row.id}.json`), JSON.stringify(row, null, 2));
    }
  }
  return report;
}

module.exports = { runProgram, runJourney, CHARACTERS };
