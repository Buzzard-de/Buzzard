/**
 * Links that the first integration pass did not call.
 * Invented carrier prices are not copied onto an order.
 * Reservations stay in the caller-supplied sqlite file.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const customs = require("../buzzardNative/core/customs/engine");
const { quoteLane } = require("./ab27Logistics");
const { inspectTree, suggestPlacement } = require("../buzzardNative/core/specialists/categoryEngine");
const { dispatch, AGENT_KINDS } = require("../buzzardNative/core/specialistDispatch");
const { assessVoice } = require("../voice/voiceReadiness");
const { cloneAttempt } = require("../buzzardNative/speech/officialVoiceGuard");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");
const { isSalesEnabled } = require("../salesMode");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function routeShipment({ sku = "brake_pad", origin = "DE", destination = "FR" } = {}) {
  const screened = customs.screen({
    actorId: "tuncay_bey",
    sku,
    origin,
    sellerCountry: origin,
    customerCountry: destination,
    destination,
    endUser: "retail",
  });
  if (!screened.ok) return { ok: false, code: screened.code, laneAttached: false, liveCarrier: false };
  if (screened.sanctioned || screened.dualUse || screened.status === "BLOCKED") {
    return { ok: false, code: "SHIPMENT_HELD", laneAttached: false, liveCarrier: false, autoClear: false };
  }
  const lane = quoteLane({ destination, weightKg: 1 });
  if (lane.code === "UNKNOWN_DESTINATION") {
    return { ok: false, code: lane.code, laneAttached: false, liveCarrier: false, shippingCost: null };
  }
  return {
    ok: false,
    code: "SHIPPING_RATE_UNVERIFIED",
    shippingPrice: "UNKNOWN",
    shippingCost: null,
    commercialEligibility: "BLOCKED",
    inventedPriceDiscarded: lane.inventedPriceDiscarded === true,
    notForAutoselect: lane.notForAutoselect === true,
    laneAttached: false,
    liveCarrier: false,
  };
}

function placeProduct({ sku = "SYN-PAD", hint } = {}) {
  const tree = inspectTree({ actorId: "category_ai" });
  if (!tree.ok) return tree;
  const code = hint || tree.codes[0];
  const placed = suggestPlacement({ actorId: "category_ai", sku, hint: code });
  const retired = suggestPlacement({ actorId: "category_ai", sku, hint: (tree.retired || [])[0] });
  return {
    ok: placed.ok === true && placed.applyLive === false,
    suggested: placed.suggested,
    retiredRejected: retired.rejectedRetired || null,
    count: tree.count,
    liveMarketplaceMap: tree.liveMarketplaceMap,
  };
}

function councilThink() {
  const ids = Object.keys(AGENT_KINDS);
  const results = ids.map((agentId) => dispatch({ agentId, kind: "THINK", input: { ask_expertise: true } }));
  const denied = dispatch({ agentId: "banu_hanim", kind: "BANK_TRANSFER" });
  return {
    ok: ids.length === 17 && results.every((row) => row.live === false) && denied.code === "UNAUTHORIZED_KIND",
    agents: ids.length,
    denied: denied.code,
    live: false,
  };
}

function voiceBoundary() {
  const voice = assessVoice();
  const clone = cloneAttempt({ actorId: "sinan_bey", requested: true });
  return {
    ok: voice.liveCalls === false && clone.cloneAuthorized === false && clone.code === "CLONE_DENIED",
    status: voice.status,
    clone: clone.code,
    liveCalls: voice.liveCalls,
  };
}

function reportOrder(order) {
  const raw = String(order.customerId || "");
  const customerRef = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
  const body = { orderId: order.orderId, customerRef, stageCount: Object.keys(order.stages || {}).length, live: false };
  const serialized = JSON.stringify(body);
  return {
    ok: raw.length > 0 && !serialized.includes(raw),
    report: body,
    exportedRawCustomer: serialized.includes(raw),
  };
}

function rejectSecret(value) {
  const text = JSON.stringify(value);
  if (/sk_live|api[_-]?key|BEGIN PRIVATE KEY/i.test(text)) {
    return { ok: false, code: "SECRET_REJECTED", stored: false, logged: false };
  }
  return { ok: true, code: "NO_SECRET", stored: false };
}

function openHolds(dbPath) {
  if (!dbPath) throw new Error("HOLD_PATH_REQUIRED");
  const resolved = path.resolve(dbPath);
  assertNotGuardian(resolved);
  if (path.basename(resolved) === "buzzard.db") throw new Error("DEV_DB_FORBIDDEN");
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS holds (
      idempotency_key TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      qty INTEGER NOT NULL,
      status TEXT NOT NULL,
      order_ref TEXT
    );
    CREATE TABLE IF NOT EXISTS hold_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      body TEXT NOT NULL
    );
  `);
  try {
    db.exec("ALTER TABLE holds ADD COLUMN order_ref TEXT");
  } catch {
    /* isolated files created with the column already have it */
  }
  const calls = new Map();

  function audit(event, body) {
    db.prepare("INSERT INTO hold_audit (event, body) VALUES (?, ?)").run(event, JSON.stringify(body));
  }

  function counterReasons(input = {}) {
    const reasons = [];
    if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
    reasons.push("ORDER_UNVERIFIED");
    reasons.push("STOCK_UNVERIFIED");
    reasons.push("SUPPLIER_COST_UNVERIFIED");
    const observed = input.observedAt || input.stockObservedAt;
    if (!observed || Number.isNaN(Date.parse(String(observed)))) reasons.push("STALE_STOCK");
    if (input.mock === true || input.demo === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") {
      reasons.push("MOCK_STOCK");
    }
    return reasons;
  }

  function counterResult(fixtureCode, input, extra = {}) {
    const reasons = counterReasons(input);
    if (extra.duplicate) reasons.unshift("DUPLICATE_RESERVATION");
    return {
      ok: false,
      code: extra.duplicate ? "DUPLICATE_RESERVATION" : reasons[0] || "STOCK_UNVERIFIED",
      fixtureCode,
      fixtureOnly: true,
      purpose: "ISOLATED_TEST_COUNTER",
      commercialReservation: false,
      reservationCreated: false,
      supplierConfirmed: false,
      purchased: false,
      commercial: false,
      stockChanged: false,
      stockVerified: false,
      quantityAdopted: false,
      live: false,
      callerFlagIgnored: true,
      reasons,
      ...extra,
    };
  }

  function reserve(input = {}) {
    const { key, sku = "SYN-PAD", qty = 1, actor = "stock_ai", orderId = null } = input;
    const seen = calls.get(actor) || 0;
    if (seen >= 5) {
      return { ok: false, code: "RATE_LIMITED", fixtureOnly: true, commercialReservation: false, held: reservedQty(), live: false, stockChanged: false };
    }
    calls.set(actor, seen + 1);
    const secret = rejectSecret({ key, sku });
    if (!secret.ok) {
      audit("SECRET_REJECTED", { stored: false });
      return { ...secret, held: reservedQty(), fixtureOnly: true, commercialReservation: false, stockChanged: false };
    }
    const orderRef = orderId || null;
    const existing = db.prepare(
      "SELECT qty, status FROM holds WHERE status = 'TEST_FIXTURE' AND (idempotency_key = ? OR (order_ref IS NOT NULL AND order_ref = ?))"
    ).get(key, orderRef);
    if (existing) {
      audit("RESERVE_DUPLICATE", { key, fixtureOnly: true });
      return counterResult("DUPLICATE_HOLD", input, { qty: existing.qty, held: reservedQty(), duplicate: true });
    }
    const fixtureQty = Number.isInteger(Number(qty)) && Number(qty) > 0 ? Number(qty) : 0;
    db.prepare(
      "INSERT INTO holds (idempotency_key, sku, qty, status, order_ref) VALUES (?, ?, ?, 'TEST_FIXTURE', ?)"
    ).run(key, sku, fixtureQty, orderRef);
    audit("RESERVE", { key, qty: fixtureQty, fixtureOnly: true });
    return counterResult("RESERVED", input, { qty: fixtureQty, held: reservedQty() });
  }

  function release(key) {
    const row = db.prepare("SELECT status FROM holds WHERE idempotency_key = ?").get(key);
    if (!row || row.status !== "TEST_FIXTURE") {
      return { ok: false, code: "HOLD_NOT_FOUND", fixtureOnly: true, commercialReservation: false, held: reservedQty(), live: false, stockChanged: false };
    }
    db.prepare("UPDATE holds SET status = 'RELEASED' WHERE idempotency_key = ?").run(key);
    audit("RELEASE", { key, fixtureOnly: true });
    return {
      ok: false,
      code: "RELEASED",
      fixtureCode: "RELEASED",
      fixtureOnly: true,
      purpose: "ISOLATED_TEST_COUNTER",
      commercialReservation: false,
      supplierConfirmed: false,
      purchased: false,
      commercial: false,
      stockChanged: false,
      held: reservedQty(),
      live: false,
    };
  }

  function reservedQty() {
    return db.prepare("SELECT COALESCE(SUM(qty), 0) n FROM holds WHERE status = 'TEST_FIXTURE'").get().n;
  }

  function auditCount() {
    return db.prepare("SELECT COUNT(*) n FROM hold_audit").get().n;
  }

  function close() {
    db.close();
  }

  return { reserve, release, reservedQty, auditCount, close, path: resolved };
}

function recover(run, { attempts = 2 } = {}) {
  let last = { ok: false, code: "NOT_RUN" };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      last = run(attempt);
    } catch (error) {
      last = { ok: false, code: "FAILED", error: error.message };
    }
    if (last && last.ok) return { ...last, attempts: attempt };
  }
  return { ...last, attempts, isolated: true };
}

function runLinks({ holdPath, checkpointPath = null, order } = {}) {
  const holds = openHolds(holdPath);
  const reserved = holds.reserve({ key: "hold-1", qty: 2 });
  const again = holds.reserve({ key: "hold-1", qty: 9 });
  const released = holds.release("hold-1");
  const heldAfterRelease = holds.reservedQty();
  let limited = { ok: true };
  for (let i = 0; i < 6; i += 1) limited = holds.reserve({ key: `burst-${i}`, actor: "burst" });
  const secretAuditBefore = holds.auditCount();
  const secret = holds.reserve({ key: "secret", sku: "sk_live_example" });
  const tasks = [
    { id: "PRODUCT_CATEGORY", dependencies: [], ok: placeProduct().ok === true && placeProduct().liveMarketplaceMap === false },
    { id: "CUSTOMS_BLOCKS_DUAL_USE", dependencies: [], ok: routeShipment({ sku: "encryption_module", destination: "FR" }).code === "SHIPMENT_HELD" },
    { id: "CUSTOMS_BLOCKS_SANCTION", dependencies: [], ok: routeShipment({ sku: "brake_pad", destination: "KP" }).code === "SHIPMENT_HELD" },
    { id: "SHIPPING_DISCARDS_INVENTED_PRICE", dependencies: ["CUSTOMS_BLOCKS_DUAL_USE"], ok: routeShipment({ destination: "FR" }).shippingPrice === "UNKNOWN" && routeShipment({ destination: "FR" }).inventedPriceDiscarded === true },
    { id: "RESERVE_AND_RELEASE", dependencies: [], ok: reserved.fixtureCode === "RESERVED" && reserved.code === "SALES_CLOSED" && reserved.commercialReservation === false && again.code === "DUPLICATE_RESERVATION" && again.fixtureCode === "DUPLICATE_HOLD" && again.qty === 2 && released.code === "RELEASED" && heldAfterRelease === 0 },
    { id: "RATE_LIMIT", dependencies: ["RESERVE_AND_RELEASE"], ok: limited.code === "RATE_LIMITED" },
    { id: "SECRET_NOT_STORED", dependencies: [], ok: secret.code === "SECRET_REJECTED" && secret.stored === false && holds.auditCount() === secretAuditBefore + 1 },
    { id: "PUSAT_17", dependencies: [], ok: councilThink().ok === true },
    { id: "VOICE_NOT_LIVE", dependencies: ["PUSAT_17"], ok: voiceBoundary().ok === true },
    { id: "REPORT_REDACTS_CUSTOMER", dependencies: [], ok: order ? reportOrder(order).exportedRawCustomer === false : false },
    {
      id: "RETRY_RECOVERY",
      dependencies: [],
      ok: recover((attempt) => (attempt < 2 ? { ok: false, code: "TRANSIENT" } : { ok: true, code: "RECOVERED" })).code === "RECOVERED",
    },
  ];
  const completed = tasks.filter((task) => task.ok).length;
  const report = {
    schema: "buzzard.integration-links.v1",
    recordedAt: new Date().toISOString(),
    cursorRunsContinuously: false,
    independentWorker: false,
    liveVerified: false,
    softwareCompleted: completed,
    softwareTasks: tasks.length,
    integrationCompletion: tasks.length ? completed / tasks.length : 0,
    auditRows: holds.auditCount(),
    tasks: tasks.map((task) => ({
      id: task.id,
      dependencies: task.dependencies,
      status: task.ok ? "TEST_COMPLETE" : "FAILED",
      liveVerified: false,
      next: task.dependencies.length ? null : "external gates stay queued",
    })),
    blocked: [
      { id: "LIVE_CARRIER_RATE", status: "EXTERNAL_DEPENDENCY_BLOCKED" },
      { id: "LIVE_TARIC", status: "EXTERNAL_DEPENDENCY_BLOCKED" },
      { id: "LIVE_VOICE_CALL", status: "HUMAN_APPROVAL_REQUIRED" },
    ],
  };
  holds.close();
  if (checkpointPath) {
    fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
    fs.writeFileSync(checkpointPath, JSON.stringify(report, null, 2));
  }
  return report;
}

module.exports = {
  routeShipment,
  placeProduct,
  councilThink,
  voiceBoundary,
  reportOrder,
  rejectSecret,
  openHolds,
  recover,
  runLinks,
};
