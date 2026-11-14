import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SEED_IDS, getAgentExact } = require("../lib/buzzardNative/core/identityRegistry.js");
const { think } = require("../lib/buzzardNative/core/sharedThinking.js");
const { dispatch } = require("../lib/buzzardNative/core/specialistDispatch.js");
const { createMeetingService } = require("../lib/pusat/meetings.js");
const { holdSeedMeeting, delegateWithinMeeting } = require("../lib/pusat/council.js");
const { createMemoryStore } = require("../lib/pusat/memory.js");
const { ENGINES, snapshot, buyStock, inspectEngine, recoverEngine } = require("../lib/commerce/engineRegistry.js");
const { evaluateOffer, MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_EUR } = require("../lib/commerce/pricingPolicy.js");
const { decideAsset } = require("../lib/banking/eu27/fiatPolicy.js");
const { EU_COUNTRY_CODES, getMarket } = require("../core/marketEngineRegistry.js");
const { assessVoice } = require("../lib/voice/voiceReadiness.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { isSalesEnabled } = require("../lib/salesMode.js");
const { placeOrder } = require("../lib/commerce/storefrontCatalogAdapter.js");
const { list } = require("../lib/commerce/pimReadOnlyAdapter.js");
const { validateHierarchy } = require("../lib/commerce/categoryHierarchy.js");

test("synthetic council meeting stays inside the 17 identities", () => {
  assert.equal(SEED_IDS.length, 17);
  const reports = SEED_IDS.map((id) => {
    const agent = getAgentExact(id);
    const thought = think({ agentId: id, facts: { ask_expertise: true } });
    const dispatched = dispatch({ agentId: id, kind: "THINK", input: {} });
    return {
      id,
      role: agent.role,
      namespace: agent.memory_namespace,
      expertise: thought.expertise,
      llmCompleted: thought.llmCompleted,
      live: dispatched.live,
      ok: thought.ok === true && dispatched.ok === true,
    };
  });
  assert.equal(reports.every((row) => row.ok), true);
  assert.equal(reports.every((row) => row.llmCompleted === false && row.live === false), true);
  assert.equal(new Set(reports.map((row) => row.namespace)).size, 17);

  const meeting = createMeetingService();
  const opened = meeting.openDaily({
    chairId: "pusat",
    participantIds: ["pusat", "sinan_bey", "esat_bey", "dogu_bey", "stock_ai"],
  });
  assert.equal(opened.ok, true);
  for (const participant of opened.meeting.participants) {
    const filed = meeting.report({
      meetingId: opened.meeting.id,
      speakerId: participant.id,
      area: participant.role,
      previousStatus: "UNKNOWN",
      summary: "Synthetic local report. No live action.",
    });
    assert.equal(filed.ok, true, participant.id);
  }
  const closed = meeting.close({ meetingId: opened.meeting.id });
  assert.equal(closed.ok, true);
  assert.equal(closed.minutes.reports.length, opened.meeting.participants.length);
  assert.equal(closed.minutes.decisions.length, 0);

  const full = holdSeedMeeting();
  const seated = full.participants.map((participant) => participant.id);
  assert.equal(full.ok, true);
  assert.equal(full.count, 17);
  assert.equal(full.uniqueCount, 17);
  assert.deepEqual(seated, [...SEED_IDS]);
  assert.equal(full.chairId, "pusat");
  assert.equal(full.salesEnabled, false);
  assert.equal(full.productionReady, false);
  assert.equal(full.productionClaim, false);
  assert.equal(full.orderCreated, false);
  assert.equal(full.paymentCreated, false);
  assert.equal(full.purchased, false);
  assert.equal(full.shipmentCreated, false);
  assert.equal(full.refunded, false);
  assert.equal(full.exported, false);
  assert.equal(full.deployed, false);
  assert.equal(full.decisions[0].executed, false);
  assert.equal(full.participants.every((participant) => participant.canBuyStock === false), true);
  assert.equal(full.participants.every((participant) => participant.canExecutePayments === false), true);
  assert.equal(full.participants.every((participant) => participant.canEnableSales === false), true);
  assert.equal(full.participants.every((participant) => participant.canExportCustomerData === false), true);
  assert.equal(full.participants.every((participant) => participant.canDeploy === false), true);
  const denied = delegateWithinMeeting({ fromId: "pusat", toId: "stock_ai", permission: "STOCK_BUY" });
  assert.equal(denied.ok, false);
  assert.equal(denied.permissionIncreased, false);
  assert.equal(denied.granted, false);
  assert.equal(denied.purchased, false);
});

test("closed engines keep orders, stock, voice, and egress stopped", () => {
  const engines = snapshot();
  const stock = buyStock();
  const order = placeOrder();
  const voice = assessVoice();
  const egress = evaluateEgress({ destinationUrl: "https://api.openai.com/v1/models" });
  const fiat = decideAsset({ currency: "USDT", assetType: "crypto" });
  const priced = {
    marketplaceFee: 0,
    paymentFee: 0,
    returnReserve: 0,
    vatAmount: 0,
    vatVerified: true,
  };
  const offer = evaluateOffer({ offerPrice: 20, supplierCost: 8, shippingCost: 2, comparableMarketPrice: 30, ...priced });
  const below = evaluateOffer({ offerPrice: 1, supplierCost: 0.9, shippingCost: 0, comparableMarketPrice: 2, ...priced });
  const hierarchy = validateHierarchy();
  const memory = createMemoryStore();
  memory.putPersonal("banu_hanim", { key: "customer", value: "synthetic" });
  const stolen = memory.getPersonal("banu_hanim", "pusat");
  assert.equal(engines.count, 11);
  assert.equal(engines.anyLive, false);
  assert.equal(stock.code, "HUMAN_GATE_REQUIRED");
  assert.equal(order.orderCreated, false);
  assert.equal(order.code, "SALES_CLOSED");
  assert.equal(isSalesEnabled(), false);
  assert.equal(voice.liveCalls, false);
  assert.equal(voice.status, "BLOCKED");
  assert.equal(egress.allowed, false);
  assert.equal(fiat.code, "REJECTED_CRYPTO_POLICY");
  assert.equal(MIN_NET_PROFIT_EUR, 0.5);
  assert.equal(MARKET_UNDERCUT_EUR, 0.1);
  assert.equal(offer.ok, true);
  assert.equal(below.ok, false);
  assert.equal(below.reasons.includes("MIN_NET_PROFIT"), true);
  assert.equal(EU_COUNTRY_CODES.size, 27);
  assert.equal(getMarket("DE").countryCode, "DE");
  assert.equal(hierarchy.count, 50);
  assert.equal(stolen.code, "PERSONAL_MEMORY_DENIED");
  const search = list({ locale: "de", q: "brems" });
  assert.equal(search.openedDevDb, false);
});

test("local latency sample is separate from production capacity", () => {
  const samples = 20;
  function measure(fn) {
    const start = process.hrtime.bigint();
    for (let i = 0; i < samples; i += 1) fn();
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    return { samples, elapsedMs: Math.round(elapsedMs * 1000) / 1000, perCallMs: Math.round((elapsedMs / samples) * 1000) / 1000 };
  }
  const result = {
    search: measure(() => list({ locale: "de", q: "brems" })),
    category: measure(() => validateHierarchy()),
    pricing: measure(() =>
      evaluateOffer({
        offerPrice: 20,
        supplierCost: 8,
        shippingCost: 2,
        marketplaceFee: 0,
        paymentFee: 0,
        returnReserve: 0,
        vatAmount: 0,
        vatVerified: true,
        comparableMarketPrice: 30,
      }),
    ),
    detail: measure(() => getMarket("DE")),
    productionClaim: false,
  };
  assert.equal(result.search.samples, 20);
  assert.equal(result.pricing.perCallMs < 50, true);
  assert.equal(result.productionClaim, false);
  console.log(`GLOBAL_PERF ${JSON.stringify(result)}`);
});

test("eleven local engines report health, recovery, and performance without a purchase", () => {
  const ids = [
    "product",
    "supplier",
    "pricing",
    "inventory",
    "order",
    "marketplace",
    "returns",
    "customer",
    "market_country",
    "payment",
    "logistics",
  ];
  assert.deepEqual(ENGINES.map((engine) => engine.id), ids);
  const report = snapshot();
  assert.equal(report.count, 11);
  assert.equal(report.callableCount, 11);
  assert.equal(report.healthyCount, 11);
  assert.equal(report.failedCount, 0);
  assert.equal(report.anyLive, false);
  assert.equal(report.salesEnabled, false);
  assert.equal(report.productionReady, false);
  assert.equal(report.productionClaim, false);
  assert.equal(isSalesEnabled(), false);
  for (const engine of report.engines) {
    assert.equal(engine.callable, true, engine.id);
    assert.equal(engine.healthy, true, engine.id);
    assert.equal(engine.health, "HEALTHY", engine.id);
    assert.equal(engine.live, false, engine.id);
    assert.equal(engine.purchased, false, engine.id);
    assert.equal(engine.orderCreated, false, engine.id);
    assert.equal(engine.paymentCreated, false, engine.id);
    assert.equal(engine.supplierPurchase, false, engine.id);
  }
  assert.equal(report.recovery.recoveredCount, 11);
  assert.equal(report.recovery.failedCount, 0);
  assert.equal(report.recovery.productionClaim, false);
  assert.equal(report.performance.samples, 20);
  assert.equal(report.performance.engineCount, 11);
  assert.equal(report.performance.calls, 220);
  assert.equal(Number.isFinite(report.performance.elapsedMs), true);
  assert.equal(report.performance.elapsedMs >= 0, true);
  assert.equal(report.performance.productionClaim, false);
  assert.equal(report.performance.live, false);
  console.log(`CORE_ENGINE_HEALTH ${JSON.stringify({
    healthyCount: report.healthyCount,
    failedCount: report.failedCount,
    recoveredCount: report.recovery.recoveredCount,
    performance: report.performance,
    anyLive: report.anyLive,
    salesEnabled: report.salesEnabled,
    productionReady: report.productionReady,
  })}`);

  const missing = inspectEngine(null);
  assert.equal(missing.healthy, false);
  assert.equal(missing.status, "FAILED");
  assert.equal(missing.code, "MISSING_ENGINE");
  const commercial = inspectEngine({ id: "payment", specialist: "nedim_bey", covers: ["payment"], live: true, realMoney: true });
  assert.equal(commercial.callable, true);
  assert.equal(commercial.healthy, false);
  assert.equal(commercial.status, "FAILED");
  assert.equal(commercial.code, "COMMERCIAL_FLAG");
  assert.equal(commercial.live, false);
  assert.equal(commercial.purchased, false);
  const unknown = recoverEngine("not-an-engine");
  assert.equal(unknown.recovered, false);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.purchased, false);
  const restored = recoverEngine("inventory");
  assert.equal(restored.recovered, true);
  assert.equal(restored.purchased, false);
  assert.equal(restored.supplierPurchase, false);
  assert.equal(restored.live, false);
  assert.equal(restored.productionClaim, false);

  const stock = buyStock();
  assert.equal(stock.ok, false);
  assert.equal(stock.code, "HUMAN_GATE_REQUIRED");
  assert.equal(stock.purchased, false);
  assert.equal(stock.virtualPurchase, false);
  assert.equal(stock.stockChanged, false);
  assert.equal(stock.orderCreated, false);
  assert.equal(stock.paymentCreated, false);
  assert.equal(stock.supplierPurchase, false);
  assert.equal(stock.live, false);
});
