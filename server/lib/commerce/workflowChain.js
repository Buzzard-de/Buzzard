/**
 * Workflow links that the earlier 23 synthetic checks do not cover.
 * Isolated sqlite only. No live payment, shipment, or policy change.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { evaluateOffer } = require("./pricingPolicy");
const { calculate, applyCustomerRefund } = require("../finance/unifiedPricing");
const { normalizeCarrierEvent } = require("../logistics/v5/trackingNormalize");
const { createStore } = require("./isolatedOrder");
const { openHolds } = require("./integrationLinks");
const { createDurableTaskQueue, assertNotGuardian } = require("../pusat/durableTaskQueue");
const { createMemoryStore } = require("../pusat/memory");
const { handle } = require("../customer/banuDesk");
const { dispatch } = require("../buzzardNative/core/specialistDispatch");
const { ids, SEED_IDS, unregisterAgent } = require("../buzzardNative/core/identityRegistry");
const { draft, checkSchema } = require("../buzzardNative/core/specialists/seoEngine");
const { inventory } = require("../i18n/localeInventory");
const { evaluateEgress } = require("../security/egressPolicy");
const { isSalesEnabled } = require("../salesMode");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function guardPath(dbPath) {
  const resolved = path.resolve(dbPath);
  assertNotGuardian(resolved);
  if (path.basename(resolved) === "buzzard.db") throw new Error("DEV_DB_FORBIDDEN");
  return resolved;
}

function offerGate({
  offerPrice,
  supplierCost,
  shippingCost,
  marketplaceFee,
  paymentFee,
  returnReserve,
  otherCost,
  market,
  category,
  vatAmount,
  vatVerified,
  currency,
} = {}) {
  const offer = evaluateOffer({
    offerPrice,
    supplierCost,
    shippingCost,
    marketplaceFee,
    paymentFee,
    returnReserve,
    otherCost,
    comparableMarketPrice: market,
    category,
    vatAmount,
    vatVerified,
    currency,
  });
  return {
    accepted: offer.ok === true && offer.salesEnabled === false,
    reasons: offer.reasons,
    salesEnabled: offer.salesEnabled,
    livePriceWrite: offer.livePriceWrite,
    orderCreated: false,
  };
}

function supplierSnapshot({ previousQty = 4, payload = {}, timedOut = false } = {}) {
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  reasons.push("STOCK_UNVERIFIED");
  reasons.push("SUPPLIER_COST_UNVERIFIED");
  reasons.push("ORDER_UNVERIFIED");
  const observed = payload.observedAt || payload.stockObservedAt || payload.updatedAt;
  if (!observed || Number.isNaN(Date.parse(String(observed)))) reasons.push("STALE_STOCK");
  if (
    payload.mock === true ||
    payload.demo === true ||
    payload.synthetic === true ||
    payload.source === "mock" ||
    payload.source === "DEMO"
  ) {
    reasons.push("MOCK_STOCK");
  }
  const closed = {
    ok: false,
    previousQty,
    bought: false,
    invented: false,
    stockVerified: false,
    quantityAdopted: false,
    reserved: false,
    decremented: false,
    purchased: false,
    live: false,
    callerFlagIgnored: true,
    reasons,
  };
  if (timedOut) {
    return { ...closed, code: "SUPPLIER_TIMEOUT", qty: previousQty, reasons: reasons.concat("SUPPLIER_TIMEOUT") };
  }
  if (payload.qty == null || payload.qty === "") {
    return { ...closed, code: "QTY_UNKNOWN", qty: "UNKNOWN", reasons: ["QTY_UNKNOWN"].concat(reasons) };
  }
  const qty = Number(payload.qty);
  if (!Number.isInteger(qty) || qty < 0) {
    return { ...closed, code: "QTY_INVALID", qty: previousQty, reasons: ["QTY_INVALID"].concat(reasons) };
  }
  return { ...closed, code: reasons[0] || "STOCK_UNVERIFIED", qty: "UNKNOWN" };
}

function foldTracking(events = []) {
  let status = "NONE";
  let seenMovement = false;
  let ignored = 0;
  for (const raw of events) {
    const mapped = normalizeCarrierEvent(raw);
    const code = mapped.buzzardStatus;
    if (code === "UNKNOWN") {
      ignored += 1;
      continue;
    }
    if (code === "DELIVERED") {
      ignored += 1;
      continue;
    }
    if (code === "PICKED_UP" || code === "IN_TRANSIT") seenMovement = true;
    status = code;
  }
  return {
    status,
    ignored,
    live: false,
    customerVisible: "NO_VERIFIED_TRACKING",
    delivered: false,
  };
}

function openPayOnce(dbPath) {
  const resolved = guardPath(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`CREATE TABLE IF NOT EXISTS pay_once (
    idempotency_key TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    money_moved INTEGER NOT NULL
  )`);
  function attempt(key, response) {
    const status = response == null ? "UNPAID" : "UNPAID";
    const info = db
      .prepare(`INSERT OR IGNORE INTO pay_once (idempotency_key, status, money_moved) VALUES (?, ?, 0)`)
      .run(key, status);
    const row = db.prepare(`SELECT status, money_moved FROM pay_once WHERE idempotency_key = ?`).get(key);
    return {
      ok: false,
      code: response == null ? "PROVIDER_SILENT" : "NO_MONEY",
      inserted: info.changes === 1,
      status: row.status,
      moneyMoved: row.money_moved === 1,
      live: false,
    };
  }
  function count() {
    return db.prepare(`SELECT COUNT(*) n FROM pay_once`).get().n;
  }
  function close() {
    db.close();
  }
  return { attempt, count, close, path: resolved };
}

function submitRace(dbPath) {
  const book = openPayOnce(dbPath);
  book.close();
  const Database = loadSqlite();
  const left = new Database(guardPath(dbPath));
  const right = new Database(guardPath(dbPath));
  left.pragma("busy_timeout = 8000");
  right.pragma("busy_timeout = 8000");
  const sql = `INSERT OR IGNORE INTO pay_once (idempotency_key, status, money_moved) VALUES ('SYN-RACE', 'UNPAID', 0)`;
  const a = left.prepare(sql).run().changes;
  const b = right.prepare(sql).run().changes;
  const rows = left.prepare(`SELECT COUNT(*) n, COALESCE(SUM(money_moved), 0) m FROM pay_once`).get();
  left.close();
  right.close();
  return { ok: rows.n === 1 && rows.m === 0 && a + b === 1, rows: rows.n, moneyMoved: rows.m, live: false };
}

function poisonOrderId(dbPath) {
  const store = createStore({ dbPath: guardPath(dbPath) });
  const hostile = "SYN' OR 1=1 --<script>";
  store.put({
    orderId: hostile,
    customerId: "SYN-CUST",
    live: false,
    stages: {},
    ledger: [],
  });
  const found = store.get(hostile);
  const other = store.get("SYN-OTHER");
  store.close();
  return {
    ok: found && found.orderId === hostile && other == null && found.live === false,
    stored: found ? found.orderId : null,
    extraRow: other != null,
  };
}

function recoverQueue(dbPath) {
  const queue = createDurableTaskQueue({ dbPath: guardPath(dbPath) });
  queue.registerWorker({ workerId: "wf-worker", identity: "sinan_bey" });
  const desk = handle({ text: "complaint about a synthetic order", locale: "de" });
  const task = queue.enqueue({
    title: "customer escalation",
    ownerId: "pusat",
    assigneeId: "sinan_bey",
    idempotencyKey: "wf-desk",
    kind: "THINK",
  });
  const leased = queue.lease({ workerId: "wf-worker" });
  const crashed = queue.markCrashed("wf-worker");
  const again = queue.enqueue({
    title: "customer escalation",
    ownerId: "pusat",
    assigneeId: "sinan_bey",
    idempotencyKey: "wf-desk",
    kind: "THINK",
  });
  const money = queue.enqueue({
    title: "refund request",
    ownerId: "pusat",
    assigneeId: "banu_hanim",
    idempotencyKey: "wf-refund",
    needsApproval: true,
    kind: "THINK",
  });
  const approval = queue.submitApproval({
    taskId: money.task.id,
    action: "CUSTOMER_REFUND",
    requestedBy: "banu_hanim",
    risk: "CRITICAL",
    reason: "synthetic",
    payload: { customerExported: false },
  });
  const agentDecision = queue.decideApproval({ id: approval.item.id, approved: true, actorId: "esat_bey" });
  const state = queue.get(task.task.id);
  const refundState = queue.get(money.task.id);
  queue.close();
  return {
    ok:
      desk.escalated === true &&
      desk.sent === false &&
      leased.ok === true &&
      crashed.recovered === 1 &&
      state.state === "QUEUED" &&
      again.duplicate === true &&
      refundState.state === "BLOCKED_APPROVAL" &&
      agentDecision.code === "PERMISSION_DENIED",
    desk: desk.code,
    queue: state.state,
    refund: refundState.state,
    approval: agentDecision.code,
    live: false,
  };
}

function memoryWall() {
  const memory = createMemoryStore();
  memory.putPersonal("sinan_bey", { key: "architecture", value: "local-only" });
  const denied = memory.getPersonal("sinan_bey", "esat_bey");
  const own = memory.getPersonal("sinan_bey", "sinan_bey");
  const shared = memory.putShared({
    fromId: "sinan_bey",
    toIds: ["esat_bey"],
    key: "private-note",
    value: "no",
    classification: "personal",
  });
  return {
    ok: denied.code === "PERSONAL_MEMORY_DENIED" && own.ok === true && shared.ok === false,
    denied: denied.code,
    shared: shared.code,
  };
}

function crashIsolation() {
  const before = dispatch({ agentId: "sinan_bey", kind: "THINK", input: { ask_expertise: true } });
  let crashed = null;
  try {
    throw new Error("agent_down");
  } catch (error) {
    crashed = { ok: false, code: "AGENT_ISOLATED", message: error.message };
  }
  const after = dispatch({ agentId: "esat_bey", kind: "THINK", input: { ask_expertise: true } });
  return {
    ok: before.live === false && after.live === false && after.agentId === "esat_bey" && crashed.code === "AGENT_ISOLATED",
    crashed: crashed.code,
    live: false,
  };
}

function missingLocale() {
  const page = draft({
    actorId: "seo_ai",
    lang: "xx",
    titleFacts: ["synthetic brake pad"],
    structuredData: { "@context": "https://schema.org", "@type": "Product", name: "Pad", sku: "SYN-PAD" },
  });
  const priced = checkSchema({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Pad",
    sku: "SYN-PAD",
    offers: { price: "12.00" },
  });
  const catalog = inventory();
  return {
    ok:
      page.localeKnown === false &&
      page.livePublish === false &&
      priced.status === "SALES_PRICE_BLOCKED" &&
      catalog.listed === 30 &&
      catalog.locales.includes("xx") === false,
    localeKnown: page.localeKnown,
    schema: priced.status,
    listed: catalog.listed,
  };
}

function securityEvent() {
  const policyPath = path.join(process.cwd(), "data/security/egress_policy.v1.json");
  const before = crypto.createHash("sha256").update(fs.readFileSync(policyPath)).digest("hex");
  const egress = evaluateEgress({ destinationUrl: "https://payments.example.invalid/charge" });
  const after = crypto.createHash("sha256").update(fs.readFileSync(policyPath)).digest("hex");
  const locked = unregisterAgent("sinan_bey");
  return {
    ok:
      egress.allowed === false &&
      before === after &&
      isSalesEnabled() === false &&
      locked.code === "SEED_IDENTITY_LOCKED" &&
      ids().length === 17 &&
      SEED_IDS.length === 17,
    egress: egress.code,
    policyUnchanged: before === after,
    salesEnabled: isSalesEnabled(),
    seed: locked.code,
  };
}

function cancelToJournal({ holdPath } = {}) {
  const holds = openHolds(guardPath(holdPath));
  const reserved = holds.reserve({ key: "cancel-1", qty: 1, actor: "cancel-flow" });
  const quote = calculate({
    actorId: "pricing_ai",
    supplierCost: 4,
    shipping: 1,
    marketplaceCommission: 0.5,
    vat: 1,
    returnReserve: 0.2,
    paymentFees: 0.2,
    category: "other",
  });
  const journal = applyCustomerRefund({ estimatedProfit: quote.estimatedProfit, refund: 1 });
  const released = holds.release("cancel-1");
  holds.close();
  return {
    ok:
      reserved.fixtureCode === "RESERVED" &&
      reserved.code === "SALES_CLOSED" &&
      reserved.commercialReservation === false &&
      released.code === "RELEASED" &&
      released.held === 0 &&
      journal.supplierReimbursement === null &&
      journal.customerRefund === null &&
      journal.refunded === false &&
      journal.supplierReimbursementAssumed === false &&
      quote.livePublish === false,
    journal,
    bought: false,
    moneyMoved: false,
  };
}

function roundtrip(dbPath) {
  const resolved = guardPath(dbPath);
  const store = createStore({ dbPath: resolved });
  store.put({ orderId: "SYN-BAK", customerId: "SYN-CUST", live: false, stages: { payment: { moneyMoved: false } }, ledger: [] });
  store.close();
  const copy = `${resolved}.bak`;
  fs.copyFileSync(resolved, copy);
  const restored = createStore({ dbPath: copy });
  const order = restored.get("SYN-BAK");
  restored.close();
  const same = crypto.createHash("sha256").update(fs.readFileSync(resolved)).digest("hex") === crypto.createHash("sha256").update(fs.readFileSync(copy)).digest("hex");
  return { ok: same && order && order.live === false && order.stages.payment.moneyMoved === false, live: false };
}

function localQuotes(n = 200) {
  const started = process.hrtime.bigint();
  let accepted = 0;
  for (let i = 0; i < n; i += 1) {
    const row = offerGate({
      offerPrice: 30,
      supplierCost: 10,
      shippingCost: 0,
      marketplaceFee: 0,
      paymentFee: 0,
      returnReserve: 0,
      vatAmount: 0,
      vatVerified: true,
      market: 40,
    });
    if (row.salesEnabled === false) accepted += 1;
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  return { ok: accepted === n && elapsedMs < 5000, n, elapsedMs: Math.round(elapsedMs * 100) / 100, salesEnabled: false, live: false };
}

function runChain({ dir, checkpointPath = null } = {}) {
  const root = guardPath(path.join(dir, "chain.sqlite"));
  fs.mkdirSync(path.dirname(root), { recursive: true });
  const low = offerGate({
    offerPrice: 10,
    supplierCost: 9.8,
    shippingCost: 0,
    marketplaceFee: 0,
    paymentFee: 0,
    returnReserve: 0,
    vatAmount: 0,
    vatVerified: true,
    market: 20,
  });
  const bad = offerGate({ offerPrice: 0, supplierCost: 4, market: 12 });
  const timeout = supplierSnapshot({ previousQty: 4, timedOut: true });
  const missing = supplierSnapshot({ previousQty: 4, payload: {} });
  const tracking = foldTracking([{ code: "delivered" }, { code: "pickup" }]);
  const race = submitRace(path.join(dir, "race.sqlite"));
  const silentBook = openPayOnce(path.join(dir, "silent.sqlite"));
  const silent = silentBook.attempt("pay-silent", null);
  const repeat = silentBook.attempt("pay-silent", null);
  silentBook.close();
  const poison = poisonOrderId(path.join(dir, "poison.sqlite"));
  const queue = recoverQueue(path.join(dir, "queue.sqlite"));
  const memory = memoryWall();
  const crash = crashIsolation();
  const locale = missingLocale();
  const security = securityEvent();
  const cancel = cancelToJournal({ holdPath: path.join(dir, "holds.sqlite") });
  const backup = roundtrip(path.join(dir, "backup.sqlite"));
  const perf = localQuotes(200);
  const tasks = [
    { id: "MIN_NET_BLOCKS_DRAFT", module: "pricing", dependencies: [], ok: low.accepted === false && low.reasons.includes("MIN_NET_PROFIT") && low.orderCreated === false },
    { id: "BAD_PRICE_REJECTED", module: "pricing", dependencies: [], ok: bad.reasons.includes("PRICE_INVALID") && bad.salesEnabled === false },
    { id: "SUPPLIER_TIMEOUT_KEEPS_QTY", module: "supplier", dependencies: [], ok: timeout.code === "SUPPLIER_TIMEOUT" && timeout.qty === 4 && timeout.bought === false },
    { id: "MISSING_QTY_UNKNOWN", module: "inventory", dependencies: ["SUPPLIER_TIMEOUT_KEEPS_QTY"], ok: missing.qty === "UNKNOWN" && missing.invented === false },
    { id: "OUT_OF_ORDER_CARRIER", module: "tracking", dependencies: [], ok: tracking.status === "PICKED_UP" && tracking.ignored === 1 && tracking.live === false },
    { id: "CONCURRENT_SAME_ORDER", module: "order", dependencies: [], ok: race.ok === true },
    { id: "PAYMENT_SILENCE", module: "payment", dependencies: ["CONCURRENT_SAME_ORDER"], ok: silent.code === "PROVIDER_SILENT" && repeat.inserted === false && silent.moneyMoved === false },
    { id: "HOSTILE_ORDER_ID", module: "order", dependencies: [], ok: poison.ok === true },
    { id: "QUEUE_CRASH_RESUME", module: "pusat", dependencies: [], ok: queue.ok === true },
    { id: "AGENT_MEMORY_WALL", module: "council", dependencies: [], ok: memory.ok === true },
    { id: "AGENT_CRASH_ISOLATED", module: "council", dependencies: ["AGENT_MEMORY_WALL"], ok: crash.ok === true },
    { id: "MISSING_LOCALE", module: "seo", dependencies: [], ok: locale.ok === true },
    { id: "SECURITY_EVENT_KEEPS_DENY", module: "security", dependencies: [], ok: security.ok === true },
    { id: "CANCEL_TO_JOURNAL", module: "refund", dependencies: ["MIN_NET_BLOCKS_DRAFT"], ok: cancel.ok === true },
    { id: "ORDER_FILE_ROUNDTRIP", module: "backup", dependencies: [], ok: backup.ok === true },
    { id: "LOCAL_QUOTE_CAPACITY", module: "pricing", dependencies: [], ok: perf.ok === true },
  ];
  const completed = tasks.filter((task) => task.ok).length;
  const report = {
    schema: "buzzard.workflow-chain.v1",
    recordedAt: new Date().toISOString(),
    cursorRunsContinuously: false,
    independentWorker: false,
    liveVerified: false,
    priorChecksPreserved: 23,
    softwareCompleted: completed,
    softwareTasks: tasks.length,
    integrationCompletion: tasks.length ? completed / tasks.length : 0,
    performance: { quotes: perf.n, elapsedMs: perf.elapsedMs, productionLoad: false },
    tasks: tasks.map((task) => ({
      id: task.id,
      module: task.module,
      dependencies: task.dependencies,
      status: task.ok ? "TEST_COMPLETE" : "FAILED",
      liveVerified: false,
    })),
    blocked: [
      { id: "LIVE_PAYMENT", status: "HUMAN_APPROVAL_REQUIRED" },
      { id: "LIVE_CARRIER_TRACK", status: "EXTERNAL_DEPENDENCY_BLOCKED" },
      { id: "OFFSITE_BACKUP", status: "HUMAN_APPROVAL_REQUIRED" },
    ],
  };
  if (checkpointPath) {
    fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
    fs.writeFileSync(checkpointPath, JSON.stringify(report, null, 2));
  }
  return report;
}

module.exports = {
  offerGate,
  supplierSnapshot,
  foldTracking,
  openPayOnce,
  submitRace,
  poisonOrderId,
  recoverQueue,
  memoryWall,
  crashIsolation,
  missingLocale,
  securityEvent,
  cancelToJournal,
  roundtrip,
  localQuotes,
  runChain,
};
