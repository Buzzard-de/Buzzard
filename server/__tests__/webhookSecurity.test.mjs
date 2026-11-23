import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

/**
 * Every inbound webhook route against the real server process: unsigned,
 * badly signed, stale, replayed and duplicate requests, and valid synthetic
 * ones. Secrets are generated per run; no provider is contacted.
 */

const SCOPES = ["payment", "payout", "dispute", "marketplace", "carrier", "commerce", "provider"];
const secrets = Object.fromEntries(SCOPES.map((scope) => [scope, randomBytes(32).toString("base64url")]));
const previousPaymentSecret = randomBytes(32).toString("base64url");
const secretEnv = {
  ...Object.fromEntries(SCOPES.map((scope) => [`BUZZARD_WEBHOOK_SECRET_${scope.toUpperCase()}`, secrets[scope]])),
  BUZZARD_WEBHOOK_SECRET_PAYMENT_PREVIOUS: previousPaymentSecret,
};
const noSecretEnv = Object.fromEntries(
  SCOPES.flatMap((scope) => [
    [`BUZZARD_WEBHOOK_SECRET_${scope.toUpperCase()}`, undefined],
    [`BUZZARD_WEBHOOK_SECRET_${scope.toUpperCase()}_PREVIOUS`, undefined],
  ])
);

const nowSeconds = () => Math.floor(Date.now() / 1000);
const header = (secret, raw, timestamp = nowSeconds()) =>
  `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex")}`;

let sequence = 0;
const unique = (prefix) => `${prefix}-${Date.now().toString(36)}-${(sequence += 1)}`;

/**
 * The eight webhook routes. `prepare` creates the synthetic record the event
 * refers to and returns the payload; `effect` counts what the handler writes.
 */
const ROUTES = [
  {
    route: "/api/payments-finance/webhook",
    scope: "payment",
    accepted: 403,
    acceptedBody: { code: "PAYMENT_NOT_LIVE", realMoneyMovement: false },
    prepare(db) {
      const externalId = unique("pi-synthetic");
      db.prepare("INSERT INTO finance_payment_intents(order_number, external_id, amount) VALUES(?,?,?)").run(unique("BZ-SYN"), externalId, 10);
      return { externalId, status: "succeeded", eventId: unique("evt") };
    },
    effect: (db, payload) => db.prepare("SELECT status FROM finance_payment_intents WHERE external_id = ?").get(payload.externalId).status,
    before: "requires_payment",
    after: "requires_payment",
  },
  {
    route: "/api/webhooks/payment",
    scope: "payment",
    accepted: 200,
    prepare: () => ({ eventId: unique("evt"), orderNumber: unique("BZ-SYN"), status: "paid", type: "payment.synthetic" }),
    effect: (db, payload) => db.prepare("SELECT COUNT(*) n FROM integration_events WHERE order_number = ?").get(payload.orderNumber).n,
    before: 0,
    after: 1,
  },
  {
    route: "/api/payments-finance/provider/payout-webhook",
    scope: "payout",
    accepted: 403,
    acceptedBody: { code: "PAYOUT_NOT_LIVE", realMoneyMovement: false },
    prepare(db) {
      db.prepare("INSERT OR IGNORE INTO finance_payment_providers(code, name) VALUES('synthetic', 'Synthetic provider')").run();
      return { provider: "synthetic", externalPayoutId: unique("po-synthetic"), amount: 12.5, currency: "EUR" };
    },
    effect: (db, payload) => db.prepare("SELECT COUNT(*) n FROM finance_payouts WHERE external_payout_id = ?").get(payload.externalPayoutId).n,
    before: 0,
    after: 0,
  },
  {
    route: "/api/payments-finance/provider/dispute-webhook",
    scope: "dispute",
    accepted: 403,
    acceptedBody: { code: "DISPUTE_NOT_LIVE", realMoneyMovement: false },
    prepare(db) {
      const externalId = unique("pi-synthetic");
      db.prepare("INSERT INTO finance_payment_intents(order_number, external_id, amount) VALUES(?,?,?)").run(unique("BZ-SYN"), externalId, 10);
      return { externalId, caseId: unique("case-synthetic"), amount: 10, reason: "synthetic" };
    },
    effect: (db, payload) => db.prepare("SELECT COUNT(*) n FROM finance_disputes WHERE external_case_id = ?").get(payload.caseId).n,
    before: 0,
    after: 0,
  },
  {
    route: "/api/marketplace-hub/order-webhook",
    scope: "marketplace",
    accepted: 202,
    prepare(db) {
      db.prepare("INSERT OR IGNORE INTO marketplace_channels(code, name) VALUES('synthetic', 'Synthetic channel')").run();
      return { marketplace: "synthetic", externalOrderId: unique("mo-synthetic"), total: 20, currency: "EUR", customerCountry: "DE" };
    },
    effect: (db, payload) => db.prepare("SELECT COUNT(*) n FROM marketplace_channel_orders WHERE external_order_id = ?").get(payload.externalOrderId).n,
    before: 0,
    after: 1,
  },
  {
    route: "/api/logistics-fulfillment/carrier/webhook",
    scope: "carrier",
    accepted: 202,
    prepare(db) {
      const orderNumber = unique("BZ-SYN");
      db.prepare("INSERT INTO logistics_shipments(order_number, status) VALUES(?, 'pending')").run(orderNumber);
      return { orderNumber, status: "in_transit", location: "Synthetic hub", eventId: unique("evt") };
    },
    effect: (db, payload) => db.prepare("SELECT status FROM logistics_shipments WHERE order_number = ?").get(payload.orderNumber).status,
    before: "pending",
    after: "in_transit",
  },
  {
    // The handler behind the gate refuses while sales are locked; that is the required end state.
    route: "/api/commerce/webhooks/synthetic",
    scope: "commerce",
    accepted: 403,
    acceptedBody: { code: "webhook_blocked", orderCreated: false, paymentCreated: false },
    prepare: () => ({ id: unique("evt"), type: "payment_intent.succeeded" }),
    effect: (db) => db.prepare("SELECT COUNT(*) n FROM commerce_webhook_events").get().n,
    before: 0,
    after: 0,
  },
  {
    // No adapter exists for this route; it never changes state.
    route: "/api/webhooks/synthetic",
    scope: "provider",
    accepted: 501,
    prepare: () => ({ id: unique("evt") }),
    effect: () => 0,
    before: 0,
    after: 0,
  },
];

describe("inbound webhooks", () => {
  let api;
  let db;

  const post = (route, raw, signature, extraHeaders = {}) =>
    api.request("POST", route, {
      raw,
      headers: { "Content-Type": "application/json", ...(signature ? { "X-Buzzard-Signature": signature } : {}), ...extraHeaders },
    });

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1", ...secretEnv } });
    db = new Database(path.join(api.root, "catalog.sqlite"));
    db.pragma("busy_timeout = 5000");
  }, 90_000);
  afterAll(async () => {
    db?.close();
    await api?.stop();
  });

  it("covers every webhook route of the server", () => {
    const { WEBHOOK_ROUTES, resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(Object.keys(WEBHOOK_ROUTES).sort()).toEqual(
      [
        "POST /api/commerce/webhooks/:provider",
        "POST /api/logistics-fulfillment/carrier/webhook",
        "POST /api/marketplace-hub/order-webhook",
        "POST /api/payments-finance/provider/dispute-webhook",
        "POST /api/payments-finance/provider/payout-webhook",
        "POST /api/payments-finance/webhook",
        "POST /api/webhooks/:provider",
        "POST /api/webhooks/payment",
      ].sort()
    );
    for (const entry of ROUTES) {
      expect(resolveRoutePermission("POST", entry.route), entry.route).toEqual({ webhook: entry.scope });
    }
    // The literal route is not swallowed by the parameterised one.
    expect(resolveRoutePermission("POST", "/api/webhooks/payment")).toEqual({ webhook: "payment" });
    expect(resolveRoutePermission("POST", "/api/webhooks/:provider")).toEqual({ webhook: "provider" });
    expect(resolveRoutePermission("GET", "/api/webhooks/payment")).toBeNull();

  });

  it("leaves no registered webhook route outside the signature gate", () => {
    const out = path.join(api.root, "routes.json");
    execFileSync(process.execPath, [fileURLToPath(new URL("./support/routeInventory.cjs", import.meta.url)), out], {
      env: {
        ...process.env,
        BUZZARD_DATA_DIR: path.join(api.root, "inventory-data"),
        BUZZARD_DB_PATH: path.join(api.root, "inventory.sqlite"),
        BUZZARD_E2E_DB: "1",
        NODE_ENV: "test",
        JWT_SECRET: randomBytes(32).toString("hex"),
      },
      stdio: "pipe",
    });
    const inventory = JSON.parse(readFileSync(out, "utf8"));
    const gated = inventory.filter((route) => route.policy?.webhook).map((route) => `${route.method} ${route.path}`);
    const { WEBHOOK_ROUTES } = require("../lib/routePermissions.js");
    expect(gated.sort()).toEqual(Object.keys(WEBHOOK_ROUTES).sort());
    const named = inventory.filter((route) => /webhook/i.test(route.path) && route.method !== "GET");
    expect(named.length).toBe(8);
    for (const route of named) expect(route.policy?.webhook, `${route.method} ${route.path}`).toBeTruthy();
  });

  describe.each(ROUTES)("POST $route", (entry) => {
    const secret = secrets[entry.scope];
    let payload;
    let raw;

    beforeAll(() => {
      payload = entry.prepare(db);
      raw = JSON.stringify(payload);
    });

    it("rejects a request without a signature", async () => {
      const res = await post(entry.route, raw);
      expect(res.status).toBe(401);
      expect(res.json).toEqual({ success: false, errorKey: "webhook.signatureRequired" });
      expect(entry.effect(db, payload)).toBe(entry.before);
    });

    it("rejects a request that authenticates another way", async () => {
      const admin = await api.login("administrator");
      const withSession = await api.request("POST", entry.route, { token: admin, body: payload });
      expect(withSession.status).toBe(401);
      expect(withSession.json.errorKey).toBe("webhook.signatureRequired");
      const legacy = await post(entry.route, raw, null, {
        "X-Signature": createHmac("sha256", secret).update(raw).digest("hex"),
        "Stripe-Signature": header(secret, raw),
      });
      expect(legacy.status).toBe(401);
      expect(entry.effect(db, payload)).toBe(entry.before);
    });

    it.each([
      ["not the header format", "sha256=abcdef"],
      ["no timestamp", `v1=${"a".repeat(64)}`],
      ["no signature value", `t=${nowSeconds()}`],
      ["short signature", `t=${nowSeconds()},v1=${"a".repeat(63)}`],
      ["upper-case hex", `t=${nowSeconds()},v1=${"A".repeat(64)}`],
      ["extra field", `t=${nowSeconds()},v1=${"a".repeat(64)},v0=1`],
      ["fractional timestamp", `t=${nowSeconds()}.5,v1=${"a".repeat(64)}`],
      ["negative timestamp", `t=-1,v1=${"a".repeat(64)}`],
      ["oversized header", `t=${nowSeconds()},v1=${"a".repeat(64)}${" ".repeat(200)}`],
    ])("rejects a malformed signature header: %s", async (_label, value) => {
      const res = await post(entry.route, raw, value);
      expect(res.status).toBe(401);
      expect(res.json.errorKey).toBe("webhook.signatureInvalid");
    });

    it("rejects a signature made with a different secret", async () => {
      const guesses = [randomBytes(32).toString("base64url"), "", "secret", ...SCOPES.filter((scope) => scope !== entry.scope).map((scope) => secrets[scope])];
      for (const guess of guesses) {
        const res = await post(entry.route, raw, header(guess, raw));
        expect(res.status).toBe(401);
        expect(res.json.errorKey).toBe("webhook.signatureInvalid");
      }
      expect(entry.effect(db, payload)).toBe(entry.before);
    });

    it("rejects a body that differs from the signed one", async () => {
      const signature = header(secret, raw);
      for (const tampered of [`${raw} `, raw.replace("{", '{"extra":1,'), JSON.stringify(payload, null, 1), ""]) {
        const res = await post(entry.route, tampered, signature);
        expect(res.status, JSON.stringify(tampered).slice(0, 30)).toBe(401);
        expect(res.json.errorKey).toBe("webhook.signatureInvalid");
      }
      expect(entry.effect(db, payload)).toBe(entry.before);
    });

    it("rejects a timestamp outside five minutes, old or future", async () => {
      for (const offset of [-301, -3600, -86_400, 301, 3600]) {
        const res = await post(entry.route, raw, header(secret, raw, nowSeconds() + offset));
        expect(res.status, String(offset)).toBe(401);
        expect(res.json.errorKey).toBe("webhook.timestampOutOfRange");
      }
      // A valid signature for the old timestamp does not help when the timestamp is swapped.
      const old = header(secret, raw, nowSeconds() - 3600);
      const swapped = await post(entry.route, raw, old.replace(/^t=\d+/, `t=${nowSeconds()}`));
      expect(swapped.status).toBe(401);
      expect(swapped.json.errorKey).toBe("webhook.signatureInvalid");
      expect(entry.effect(db, payload)).toBe(entry.before);
    });

    it("accepts a valid synthetic signature once, refuses the replay, acknowledges the duplicate", async () => {
      const timestamp = nowSeconds();
      const signature = header(secret, raw, timestamp);

      const first = await post(entry.route, raw, signature);
      expect(first.status, first.text.slice(0, 200)).toBe(entry.accepted);
      if (entry.acceptedBody) expect(first.json).toMatchObject(entry.acceptedBody);
      expect(first.json?.errorKey ?? "").not.toMatch(/^webhook\./);
      expect(entry.effect(db, payload)).toBe(entry.after);

      // The same signed request again.
      const replay = await post(entry.route, raw, signature);
      expect(replay.status).toBe(409);
      expect(replay.json).toEqual({ success: false, errorKey: "webhook.replayed" });

      // The same event with a fresh signature (a retry by the sender).
      const retry = await post(entry.route, raw, header(secret, raw, timestamp + 1));
      if (entry.accepted >= 200 && entry.accepted < 300) {
        expect(retry.status).toBe(200);
        expect(retry.json).toEqual({ success: true, duplicate: true });
      } else {
        // The handler did not complete the event, so the retry reaches it again.
        expect(retry.status).toBe(entry.accepted);
      }
      expect(entry.effect(db, payload)).toBe(entry.after);
    });

    it("still refuses unsigned requests after a valid one", async () => {
      const res = await post(entry.route, raw);
      expect(res.status).toBe(401);
    });
  });

  describe("replay and duplicate handling", () => {
    const route = "/api/payments-finance/provider/payout-webhook";
    const payouts = (id) => db.prepare("SELECT COUNT(*) n FROM finance_payouts WHERE external_payout_id = ?").get(id).n;

    beforeAll(() => {
      db.prepare("INSERT OR IGNORE INTO finance_payment_providers(code, name) VALUES('synthetic', 'Synthetic provider')").run();
    });

    it("processes ten parallel deliveries of one signed request exactly once", async () => {
      const payload = { provider: "synthetic", externalPayoutId: unique("po-parallel"), amount: 1 };
      const raw = JSON.stringify(payload);
      const signature = header(secrets.payout, raw);
      const results = await Promise.all(Array.from({ length: 10 }, () => post(route, raw, signature)));
      const statuses = results.map((res) => res.status).sort();
      expect(statuses.filter((status) => status === 403)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(9);
      expect(payouts(payload.externalPayoutId)).toBe(0);
    });

    it("processes ten differently signed deliveries of one event exactly once", async () => {
      const payload = { provider: "synthetic", externalPayoutId: unique("po-retry"), amount: 1 };
      const raw = JSON.stringify(payload);
      const base = nowSeconds();
      const results = [];
      for (let i = 0; i < 10; i += 1) results.push(await post(route, raw, header(secrets.payout, raw, base - i)));
      expect(results.every((res) => res.status === 403)).toBe(true);
      expect(results.every((res) => res.json.code === "PAYOUT_NOT_LIVE")).toBe(true);
      expect(payouts(payload.externalPayoutId)).toBe(0);
    });

    it("uses the sender's event id when there is one, independent of the payload bytes", async () => {
      const id = unique("po-evt");
      const eventId = unique("evt");
      const first = JSON.stringify({ provider: "synthetic", externalPayoutId: id, amount: 1 });
      const second = JSON.stringify({ amount: 1, externalPayoutId: id, provider: "synthetic" });
      const a = await post(route, first, header(secrets.payout, first), { "X-Buzzard-Event-Id": eventId });
      const b = await post(route, second, header(secrets.payout, second), { "X-Buzzard-Event-Id": eventId });
      expect(a.status).toBe(403);
      expect(b.status).toBe(403);
      expect(a.json.code).toBe("PAYOUT_NOT_LIVE");
      expect(payouts(id)).toBe(0);
    });

    it("keeps event ids of different scopes apart", async () => {
      const eventId = unique("evt-shared");
      const payout = JSON.stringify({ provider: "synthetic", externalPayoutId: unique("po-scope"), amount: 1, eventId });
      const payment = JSON.stringify({ eventId, orderNumber: unique("BZ-SYN"), status: "failed" });
      expect((await post(route, payout, header(secrets.payout, payout))).status).toBe(403);
      expect((await post("/api/webhooks/payment", payment, header(secrets.payment, payment))).status).toBe(200);
    });

    it("lets a retry through when the first delivery was not completed", async () => {
      const externalId = unique("pi-late");
      const raw = JSON.stringify({ externalId, status: "succeeded", eventId: unique("evt") });
      const base = nowSeconds();
      const first = await post("/api/payments-finance/webhook", raw, header(secrets.payment, raw, base));
      expect(first.status).toBe(403);
      expect(first.json.code).toBe("PAYMENT_NOT_LIVE");

      db.prepare("INSERT INTO finance_payment_intents(order_number, external_id, amount) VALUES(?,?,?)").run(unique("BZ-SYN"), externalId, 10);
      const retry = await post("/api/payments-finance/webhook", raw, header(secrets.payment, raw, base + 1));
      expect(retry.status).toBe(403);
      expect(db.prepare("SELECT status FROM finance_payment_intents WHERE external_id = ?").get(externalId).status).toBe("requires_payment");

      const again = await post("/api/payments-finance/webhook", raw, header(secrets.payment, raw, base + 2));
      expect(again.status).toBe(403);
      expect(again.json.realMoneyMovement).toBe(false);
    });

    it("accepts the previous secret of a scope during a rotation and nothing older", async () => {
      const raw = JSON.stringify({ eventId: unique("evt"), orderNumber: unique("BZ-SYN"), status: "failed" });
      expect((await post("/api/webhooks/payment", raw, header(previousPaymentSecret, raw))).status).toBe(200);
      const other = JSON.stringify({ provider: "synthetic", externalPayoutId: unique("po-rot"), amount: 1 });
      expect((await post(route, other, header(previousPaymentSecret, other))).status).toBe(401);
    });
  });

  describe("payload checks behind a valid signature", () => {
    const send = (route, scope, payload) => {
      const raw = JSON.stringify(payload);
      return post(route, raw, header(secrets[scope], raw));
    };

    it.each([
      ["/api/payments-finance/webhook", "payment", { externalId: "x".repeat(200), status: "succeeded" }],
      ["/api/payments-finance/webhook", "payment", { externalId: "pi-1", status: "succeeded'; DROP TABLE users;--" }],
      ["/api/payments-finance/webhook", "payment", { externalId: { $ne: null }, status: "succeeded" }],
      ["/api/webhooks/payment", "payment", { eventId: "evt 1\n2", orderNumber: "BZ-1", status: "paid" }],
      ["/api/webhooks/payment", "payment", { eventId: "evt-1", orderNumber: ["BZ-1"], status: "paid" }],
      ["/api/payments-finance/provider/payout-webhook", "payout", { provider: "synthetic", amount: -5 }],
      ["/api/payments-finance/provider/payout-webhook", "payout", { provider: "synthetic", amount: "1e99" }],
      ["/api/payments-finance/provider/payout-webhook", "payout", { provider: "synthetic", amount: 1, currency: "EURO" }],
      ["/api/payments-finance/provider/payout-webhook", "payout", { provider: "synthetic", amount: 1, payoutDate: "yesterday" }],
      ["/api/marketplace-hub/order-webhook", "marketplace", { marketplace: "synthetic", externalOrderId: "mo-1", total: "NaN" }],
      ["/api/marketplace-hub/order-webhook", "marketplace", { marketplace: "synthetic", externalOrderId: "mo-1", customerCountry: "Germany" }],
    ])("%s refuses %j", async (route, scope, payload) => {
      const res = await send(route, scope, payload);
      expect(res.status).toBe(400);
      expect(api.alive()).toBe(true);
    });

    it("refuses a carrier event with an unusable status or time", async () => {
      const orderNumber = unique("BZ-SYN");
      db.prepare("INSERT INTO logistics_shipments(order_number, status) VALUES(?, 'pending')").run(orderNumber);
      for (const payload of [
        { orderNumber, status: "<script>alert(1)</script>" },
        { orderNumber, status: "delivered", eventTime: "not a date" },
        { orderNumber, status: "delivered", message: { text: "x" } },
      ]) {
        expect((await send("/api/logistics-fulfillment/carrier/webhook", "carrier", payload)).status).toBe(400);
      }
      expect(db.prepare("SELECT status FROM logistics_shipments WHERE order_number = ?").get(orderNumber).status).toBe("pending");
    });

    it("refuses a signed body that is not JSON", async () => {
      const raw = "{not json";
      const res = await post("/api/webhooks/payment", raw, header(secrets.payment, raw));
      expect(res.status).toBe(400);
      expect(res.json.errorKey).toBe("security.invalidJson");
    });
  });

  describe("records", () => {
    it("logs rejected and accepted webhooks without signature, secret or payload", async () => {
      const log = api.readStore("security-log.json");
      const rejected = log.filter((entry) => entry.type === "webhook_rejected");
      const reasons = new Set(rejected.map((entry) => entry.detail.reason));
      for (const reason of ["missing_signature", "malformed_signature", "bad_signature", "timestamp_out_of_range", "replay"]) {
        expect(reasons.has(reason), reason).toBe(true);
      }
      expect(rejected.every((entry) => entry.severity === "HIGH" && entry.success === false && entry.ip)).toBe(true);
      expect(log.some((entry) => entry.type === "webhook_accepted" && entry.success === true)).toBe(true);
      expect(log.some((entry) => entry.type === "webhook_duplicate")).toBe(true);

      const text = JSON.stringify(log);
      for (const secret of [...Object.values(secrets), previousPaymentSecret]) expect(text).not.toContain(secret);
      expect(text).not.toMatch(/v1=[a-f0-9]{64}/);
    });

    it("stores receipts as scope and id only", () => {
      const rows = db.prepare("SELECT scope, kind, status FROM webhook_receipts").all();
      expect(rows.length).toBeGreaterThan(10);
      expect(new Set(rows.map((row) => row.kind))).toEqual(new Set(["signature", "event"]));
      const columns = db.prepare("PRAGMA table_info(webhook_receipts)").all().map((column) => column.name);
      expect(columns).toEqual(["id", "scope", "kind", "value", "status", "received_at"]);
    });

    it("never prints a secret or a signature", () => {
      const output = api.output();
      for (const secret of [...Object.values(secrets), previousPaymentSecret]) expect(output).not.toContain(secret);
      expect(output).not.toMatch(/v1=[a-f0-9]{64}/);
    });
  });
});

describe("webhook routes without a configured secret", () => {
  let api;
  beforeAll(async () => {
    api = await startIsolatedApi({
      env: { BUZZARD_TEST_MODE: "1", ...noSecretEnv, BUZZARD_WEBHOOK_SECRET_PAYOUT: "too-short", BUZZARD_WEBHOOK_SECRET_DISPUTE: "x".repeat(40) },
    });
  }, 90_000);
  afterAll(async () => api?.stop());

  it.each(ROUTES)("POST $route refuses every request", async (entry) => {
    const raw = JSON.stringify({ eventId: "evt-unconfigured", orderNumber: "BZ-SYN-0", status: "paid" });
    const guesses = [undefined, header("", raw), header("too-short", raw), header("x".repeat(40), raw), header("undefined", raw)];
    for (const signature of guesses) {
      const res = await api.request("POST", entry.route, {
        raw,
        headers: { "Content-Type": "application/json", ...(signature ? { "X-Buzzard-Signature": signature } : {}) },
      });
      expect(res.status).toBe(503);
      expect(res.json).toEqual({ success: false, errorKey: "webhook.notConfigured" });
    }
  });

  it("reports the state in the health answer without naming secrets", async () => {
    const res = await api.request("GET", "/api/health");
    expect(res.json.commercial.webhooks.configured).toBe(false);
    expect(res.text).not.toContain("too-short");
  });
});

describe("webhook failure budget", () => {
  let api;
  const secret = randomBytes(32).toString("base64url");
  beforeAll(async () => {
    api = await startIsolatedApi({
      env: { BUZZARD_TEST_MODE: undefined, BUZZARD_RATE_LIMIT_DISABLED: undefined, ...noSecretEnv, BUZZARD_WEBHOOK_SECRET_PAYMENT: secret },
    });
  }, 90_000);
  afterAll(async () => api?.stop());

  it("stops an address after 30 rejected signatures in a minute, also for a valid one", async () => {
    const raw = JSON.stringify({ eventId: "evt-budget", orderNumber: "BZ-SYN-BUDGET", status: "failed" });
    const statuses = [];
    for (let i = 0; i < 33; i += 1) {
      const res = await api.request("POST", "/api/webhooks/payment", {
        raw,
        headers: { "Content-Type": "application/json", "X-Buzzard-Signature": header(randomBytes(32).toString("hex"), raw) },
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 30).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(30)).toEqual([429, 429, 429]);

    const valid = await api.request("POST", "/api/webhooks/payment", {
      raw,
      headers: { "Content-Type": "application/json", "X-Buzzard-Signature": header(secret, raw) },
    });
    expect(valid.status).toBe(429);

    // The limiter answer itself is not written to the log once per request.
    const rejected = api.readStore("security-log.json").filter((entry) => entry.type === "webhook_rejected");
    expect(rejected).toHaveLength(30);
  });

  it("counts unsigned webhook requests against the anonymous write budget", async () => {
    const statuses = [];
    for (let i = 0; i < 64; i += 1) {
      statuses.push((await api.request("POST", "/api/payments-finance/webhook", { body: { externalId: "x", status: "succeeded" } })).status);
    }
    expect(statuses.filter((status) => status === 200 || status === 202)).toHaveLength(0);
    expect(statuses.slice(-3)).toEqual([429, 429, 429]);
  });
});

describe("production start with webhook secrets", () => {
  const production = {
    NODE_ENV: "production",
    JWT_SECRET: randomBytes(32).toString("base64"),
    ADMIN_EMAIL: "owner@unit.buzzard.test",
    ADMIN_PASSWORD: `Unit-${randomBytes(12).toString("base64url")}-7q`,
    BUZZARD_TEST_MODE: undefined,
    BUZZARD_RATE_LIMIT_DISABLED: undefined,
    BUZZARD_E2E_DB: undefined,
    BUZZARD_TRUSTED_PROXY_HOPS: "0",
    ...noSecretEnv,
  };
  let api;
  afterAll(async () => api?.stop());

  it("refuses to start with a short or placeholder webhook secret", async () => {
    for (const weak of ["Short-Secret-123", "change-me", "a".repeat(64)]) {
      const refused = await startIsolatedApi({ env: { ...production, BUZZARD_WEBHOOK_SECRET_PAYMENT: weak }, seed: false, expectExit: true });
      const exit = await Promise.race([refused.exited, new Promise((resolve) => setTimeout(() => resolve("still running"), 45_000))]);
      expect(exit).not.toBe("still running");
      expect(exit.code).toBe(1);
      expect(refused.output()).toMatch(/Webhook secret too short or a placeholder.*BUZZARD_WEBHOOK_SECRET_PAYMENT/);
      expect(refused.output()).not.toContain(weak);
      expect(refused.output()).not.toMatch(/Buzzard API server running/);
    }
  }, 180_000);

  it("starts without webhook secrets, warns, and refuses unsigned production webhooks", async () => {
    api = await startIsolatedApi({ env: production, seed: false });
    expect(api.output()).toMatch(/No webhook secret for: payment, payout, dispute, marketplace, carrier, commerce, provider/);
    for (const entry of ROUTES) {
      const res = await api.request("POST", entry.route, { body: { eventId: "evt-prod", orderNumber: "BZ-SYN-PROD", status: "paid" } });
      expect(res.status, entry.route).toBe(503);
    }
  }, 90_000);
});

describe("signature format", () => {
  const gate = require("../lib/webhookGate.js");

  it("builds the header the gate verifies", () => {
    const secret = randomBytes(32).toString("base64url");
    const value = gate.signatureHeader(secret, '{"a":1}', 1_800_000_000);
    expect(value).toBe(header(secret, '{"a":1}', 1_800_000_000));
    expect(gate.parseSignature(value)).toEqual({ timestamp: 1_800_000_000, signature: value.split("v1=")[1] });
  });

  it.each([null, undefined, 1, "", "t=1", "v1=abc", `t=1,v1=${"g".repeat(64)}`, `t=1,v1=${"a".repeat(64)} `, ` t=1,v1=${"a".repeat(64)}`, `t=1e3,v1=${"a".repeat(64)}`, `t=${"9".repeat(13)},v1=${"a".repeat(64)}`])(
    "does not parse %j",
    (value) => {
      expect(gate.parseSignature(value)).toBeNull();
    }
  );

  it("treats short, repetitive and placeholder secrets as not configured", () => {
    const name = "BUZZARD_WEBHOOK_SECRET_PAYMENT";
    const saved = { current: process.env[name], previous: process.env[`${name}_PREVIOUS`] };
    try {
      delete process.env[`${name}_PREVIOUS`];
      for (const weak of ["", "short", "a".repeat(64), "abababababababababababababababababab", "change-me", "x".repeat(31)]) {
        process.env[name] = weak;
        expect(gate.secretsFor("payment"), weak.slice(0, 12)).toEqual([]);
      }
      const strong = randomBytes(32).toString("base64url");
      process.env[name] = strong;
      expect(gate.secretsFor("payment")).toEqual([strong]);
      expect(gate.secretsFor("unknown-scope")).toEqual([]);
      expect(gate.secretsFor("__proto__")).toEqual([]);
    } finally {
      for (const [key, value] of [[name, saved.current], [`${name}_PREVIOUS`, saved.previous]]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
