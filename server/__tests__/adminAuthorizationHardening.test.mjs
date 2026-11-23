import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);

/**
 * Authorization details outside the route matrix: who may see the identity
 * behind an order, the budget for anonymous writes, request ids, and how
 * input the database refuses is answered. Synthetic records only.
 */

const ORDER = {
  orderNumber: "BZ-20990101-00001",
  status: "created",
  createdAt: "2099-01-01T00:00:00.000Z",
  customerId: "cust-synthetic-1",
  customer: { firstName: "Synthetic", lastName: "Buyer", email: "buyer@synthetic.invalid", phone: "+00 000 000" },
  shippingAddress: { firstName: "Synthetic", lastName: "Buyer", street: "Teststrasse 1", zip: "00000", city: "Teststadt", country: "DE" },
  billingAddress: { firstName: "Synthetic", lastName: "Buyer", street: "Teststrasse 1", zip: "00000", city: "Teststadt", country: "DE" },
  customerNote: "synthetic note",
  lines: [{ sku: "SYN-1", name: "Test part", quantity: 1, unitPrice: 10 }],
  totals: { total: 10, currency: "EUR" },
};
const IDENTITY_VALUES = ["Synthetic", "Buyer", "buyer@synthetic.invalid", "Teststrasse", "00000", "Teststadt", "+00 000 000", "synthetic note", "cust-synthetic-1"];

async function registerCustomer(api, email) {
  const res = await api.request("POST", "/api/auth/register", {
    body: { email, password: "Synthetic-Customer-Pass-1", name: "Synthetic Customer" },
  });
  expect(res.status).toBe(201);
  return res.json.token;
}

describe("identity behind an order", () => {
  let api;
  let tokens;

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
    writeFileSync(path.join(api.dataDir, "orders.json"), JSON.stringify([ORDER]));
    tokens = {};
    for (const role of ["administrator", "order_manager", "catalog_manager", "ai_agent", "read_only"]) tokens[role] = await api.login(role);
  }, 90_000);
  afterAll(async () => api?.stop());

  const lookup = (token) => api.request("GET", `/api/orders/${ORDER.orderNumber}`, { token });

  it("is closed to an anonymous caller who knows or guesses the order number", async () => {
    const res = await lookup();
    expect(res.status).toBe(401);
    expect(res.json.order).toBeUndefined();
    for (const value of IDENTITY_VALUES) expect(res.text, value).not.toContain(value);
  });

  it("is closed to a signed-in customer who did not place the order", async () => {
    const res = await lookup(await registerCustomer(api, "other@synthetic.invalid"));
    expect(res.status).toBe(403);
    expect(res.json.order).toBeUndefined();
    for (const value of IDENTITY_VALUES) expect(res.text, value).not.toContain(value);
  });

  it("is closed to a back-office role without orders.read", async () => {
    for (const role of ["catalog_manager", "ai_agent"]) {
      const res = await lookup(tokens[role]);
      expect(res.status, role).toBe(403);
      expect(res.json.order, role).toBeUndefined();
      for (const value of IDENTITY_VALUES) expect(res.text, `${role} ${value}`).not.toContain(value);
    }
  });

  it("is closed for a forged or malformed token", async () => {
    for (const token of ["a".repeat(64), "not-a-token", "eyJhbGciOiJub25lIn0.eyJzdWIiOjEsImVtYWlsIjoiYnV5ZXJAc3ludGhldGljLmludmFsaWQifQ."]) {
      const res = await lookup(token);
      expect(res.status, token.slice(0, 12)).toBe(401);
      expect(res.json.order).toBeUndefined();
    }
  });

  it("is returned to the customer who placed the order", async () => {
    const res = await lookup(await registerCustomer(api, "buyer@synthetic.invalid"));
    expect(res.status).toBe(200);
    expect(res.json.order.identityWithheld).toBeUndefined();
    expect(res.json.order.customer.email).toBe("buyer@synthetic.invalid");
    expect(res.json.order.shippingAddress.street).toBe("Teststrasse 1");
  });

  it("is returned to a back-office role with orders.read", async () => {
    for (const role of ["administrator", "order_manager", "read_only"]) {
      const res = await lookup(tokens[role]);
      expect(res.json.order.identityWithheld, role).toBeUndefined();
      expect(res.json.order.customer.email, role).toBe("buyer@synthetic.invalid");
    }
  });

  it("does not tell an anonymous caller whether an order number exists", async () => {
    const anonymous = await api.request("GET", "/api/orders/BZ-20990101-99999");
    expect(anonymous.status).toBe(401);
    const admin = await api.request("GET", "/api/orders/BZ-20990101-99999", { token: tokens.administrator });
    expect(admin.status).toBe(404);
    expect(admin.json.errorKey).toBe("checkout.orderNotFound");
  });
});

describe("identity account routes and payment sessions", () => {
  let api;
  let adminToken;
  let customerToken;

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
    adminToken = await api.login("administrator");
    customerToken = await registerCustomer(api, "account@synthetic.invalid");
  }, 90_000);
  afterAll(async () => api?.stop());

  it("do not accept a back-office session as a customer account", async () => {
    for (const [method, route] of [
      ["GET", "/api/identity-security/account"],
      ["PATCH", "/api/identity-security/account"],
      ["POST", "/api/identity-security/account/addresses"],
      ["POST", "/api/identity-security/account/2fa/setup"],
      ["POST", "/api/identity-security/account/2fa/disable"],
      ["POST", "/api/identity-security/privacy/request"],
    ]) {
      const res = await api.request(method, route, { token: adminToken, body: method === "GET" ? undefined : {} });
      expect(res.status, `${method} ${route}`).toBe(401);
    }
  });

  it("still serve the signed-in customer's own account", async () => {
    const res = await api.request("GET", "/api/identity-security/account", { token: customerToken });
    expect(res.status).toBe(200);
    expect(res.text).not.toMatch(/password_hash|scrypt:/);
  });

  it("refuse a payment session while sales are locked, for every caller", async () => {
    const body = { provider: "stripe", orderId: "BZ-20990101-00001", amount: 10, currency: "EUR" };
    expect((await api.request("POST", "/api/payments/session", { body })).status).toBe(401);
    for (const token of [customerToken, adminToken]) {
      const res = await api.request("POST", "/api/payments/session", { token, body });
      expect(res.status).toBe(403);
      expect(res.json.error).toBe("sales_disabled");
    }
  });

  it("does not resolve a payment provider from the object prototype", async () => {
    for (const provider of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      const res = await api.request("POST", "/api/payments/session", { token: customerToken, body: { provider, amount: 1 } });
      expect([400, 403], provider).toContain(res.status);
      expect(api.alive()).toBe(true);
    }
  });

  it("requires logistics.read for the barcode lookup", async () => {
    expect((await api.request("POST", "/api/wms-inventory/scan", { body: { barcode: "0000000000000" } })).status).toBe(401);
    const asCustomer = await api.request("POST", "/api/wms-inventory/scan", { token: customerToken, body: { barcode: "0000000000000" } });
    expect(asCustomer.status).toBe(401);
    const asCatalog = await api.request("POST", "/api/wms-inventory/scan", { token: await api.login("catalog_manager"), body: { barcode: "0000000000000" } });
    expect(asCatalog.status).toBe(403);
    expect(asCatalog.json.errorKey).toBe("admin.auth.forbidden");
    const asAdmin = await api.request("POST", "/api/wms-inventory/scan", { token: adminToken, body: { barcode: "0000000000000" } });
    expect([200, 404]).toContain(asAdmin.status);
  });
});

describe("shipment tracking by order number", () => {
  let api;
  let owner;
  let stranger;
  const ORDER_NUMBER = "BZ-20990102-00001";

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
    const registered = await api.request("POST", "/api/auth/register", {
      body: { email: "owner@synthetic.invalid", password: "Synthetic-Customer-Pass-1", name: "Synthetic Owner" },
    });
    owner = registered.json;
    stranger = await registerCustomer(api, "stranger@synthetic.invalid");

    const Database = require("better-sqlite3");
    const db = new Database(path.join(api.root, "catalog.sqlite"));
    db.pragma("busy_timeout = 5000");
    db.prepare(
      "INSERT INTO orders(order_number, user_id, country_code, currency, subtotal, shipping, tax, total, shipping_address) VALUES(?,?,?,?,?,?,?,?,?)"
    ).run(ORDER_NUMBER, owner.user.id, "DE", "EUR", 10, 0, 1.9, 11.9, JSON.stringify({ country: "DE" }));
    db.prepare("INSERT INTO logistics_shipments(order_number, tracking_number, status, destination_country) VALUES(?,?,?,?)").run(
      ORDER_NUMBER,
      "SYN-TRACK-1",
      "shipped",
      "DE"
    );
    db.close();
  }, 90_000);
  afterAll(async () => api?.stop());

  const route = `/api/logistics-fulfillment/shipments/${ORDER_NUMBER}/tracking`;

  it("is refused without a session", async () => {
    expect((await api.request("GET", route)).status).toBe(401);
  });

  it("is returned to the customer who placed the order", async () => {
    const res = await api.request("GET", route, { token: owner.token });
    expect(res.status).toBe(200);
    expect(res.json.tracking_number).toBe("SYN-TRACK-1");
  });

  it("looks like an unknown order to another signed-in customer", async () => {
    const res = await api.request("GET", route, { token: stranger });
    expect(res.status).toBe(404);
    expect(res.text).not.toContain("SYN-TRACK-1");
    const unknown = await api.request("GET", "/api/logistics-fulfillment/shipments/BZ-20990102-99999/tracking", { token: stranger });
    expect(unknown.status).toBe(404);
    expect(unknown.json).toEqual(res.json);
  });

  it("follows logistics.read for back-office roles", async () => {
    for (const role of ["administrator", "order_manager", "read_only"]) {
      const res = await api.request("GET", route, { token: await api.login(role) });
      expect(res.status, role).toBe(200);
    }
    // The existing role table gives these roles no logistics.read.
    for (const role of ["admin", "catalog_manager", "staff", "ai_agent"]) {
      const res = await api.request("GET", route, { token: await api.login(role) });
      expect(res.status, role).toBe(404);
      expect(res.text, role).not.toContain("SYN-TRACK-1");
    }
  });
});

describe("input the database refuses", () => {
  let api;
  let token;

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
    token = await api.login("administrator");
  }, 90_000);
  afterAll(async () => api?.stop());

  it.each([
    ["POST", "/api/admin/automation/schedules"],
    ["POST", "/api/admin/crm-customer-service/tickets/x1/notes"],
    ["PUT", "/api/marketing-loyalty/preferences/x1"],
    ["POST", "/api/admin/pim-core/supplier-mappings"],
  ])("%s %s with an empty body is a 400, not a server error", async (method, route) => {
    const res = await api.request(method, route, { token, body: {} });
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ success: false, errorKey: "security.invalidInput" });
    expect(res.text).not.toMatch(/SQLITE|constraint|at \w+ \(/i);
    expect(api.alive()).toBe(true);
  });

  it("serves the merchant feed as XML", async () => {
    const res = await api.request("GET", "/api/catalog/feed/google.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/xml/);
  });
});

describe("request and correlation ids", () => {
  let api;
  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
  }, 90_000);
  afterAll(async () => api?.stop());

  it("echoes a well-formed id", async () => {
    const res = await api.request("GET", "/api/health", { headers: { "X-Request-Id": "req-synthetic.1:a_b", "X-Correlation-Id": "corr-synthetic-1" } });
    expect(res.headers.get("x-request-id")).toBe("req-synthetic.1:a_b");
    expect(res.headers.get("x-correlation-id")).toBe("corr-synthetic-1");
  });

  it.each([
    ["too long", "a".repeat(65)],
    ["markup", "<script>alert(1)</script>"],
    ["spaces and quotes", 'id" injected="1'],
    ["path", "../../etc/passwd"],
    ["empty", ""],
  ])("replaces an id that is %s with a generated one", async (_label, value) => {
    const res = await api.request("GET", "/api/health", { headers: { "X-Request-Id": value, "X-Correlation-Id": value } });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toMatch(/^req_[a-f0-9]{16}$/);
    expect(res.headers.get("x-correlation-id")).toMatch(/^corr_[a-f0-9]{16}$/);
  });

  it("gives every request its own id when none is sent", async () => {
    const ids = new Set();
    for (let i = 0; i < 20; i += 1) ids.add((await api.request("GET", "/api/health")).headers.get("x-request-id"));
    expect(ids.size).toBe(20);
  });

  it("keeps the context store bounded and releases contexts", () => {
    const ctx = require("../lib/operations/correlationContext.js");
    const first = ctx.createContext({ requestId: "first-synthetic" });
    expect(ctx.getContext("first-synthetic")).toBe(first);
    for (let i = 0; i < ctx.MAX_CONTEXTS + 50; i += 1) ctx.createContext({});
    expect(ctx.getContext("first-synthetic")).toBeNull();
    const held = ctx.createContext({ requestId: "held-synthetic" });
    ctx.releaseContext(held.requestId);
    expect(ctx.getContext("held-synthetic")).toBeNull();
    expect(ctx.acceptId("ok-1")).toBe("ok-1");
    for (const bad of [null, undefined, 1, {}, ["a"], "a b", "a\nb", "é", "a".repeat(65)]) expect(ctx.acceptId(bad)).toBeNull();
  });
});

describe("budget for anonymous writes", () => {
  let api;
  let token;
  beforeAll(async () => {
    // Limiter on: no test mode.
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: undefined, BUZZARD_RATE_LIMIT_DISABLED: undefined } });
    // Signing in is itself an anonymous write, so it happens before the budget is used up.
    token = await api.login("read_only");
  }, 90_000);
  afterAll(async () => api?.stop());

  it("stops an address after 60 anonymous writes in a minute and records it", async () => {
    const statuses = [];
    for (let i = 0; i < 63; i += 1) {
      statuses.push((await api.request("POST", "/api/tax/quote", { body: {} })).status);
    }
    // The sign-in in beforeAll was the first of the 60.
    expect(statuses.slice(0, 59).every((status) => status === 401)).toBe(true);
    expect(statuses.slice(59)).toEqual([429, 429, 429, 429]);
    const limited = await api.request("POST", "/api/tax/quote", { body: {} });
    expect(limited.json).toEqual({ success: false, errorKey: "security.rateLimited" });

    const events = api.readStore("security-log.json").filter((entry) => entry.type === "api_rate_limited");
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].detail.scope).toBe("anonymous_write");
  });

  it("does not count reads or requests that carry credentials", async () => {
    expect((await api.request("POST", "/api/tax/quote", { body: {} })).status).toBe(429);
    expect((await api.request("GET", "/api/health")).status).toBe(200);
    expect((await api.request("GET", "/api/admin/me", { token })).status).toBe(200);
    const write = await api.request("POST", "/api/admin/logout", { token });
    expect(write.status).not.toBe(429);
  });
});
