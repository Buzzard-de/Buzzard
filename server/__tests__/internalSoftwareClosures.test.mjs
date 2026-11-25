import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { createDurable } = require("../lib/pusat/durable");
const { getHealth } = require("../lib/storefront/catalogReadService");
const { getEffectiveFlags } = require("../lib/commerce/commerceFeatureFlags");
const controlCenter = require("../lib/controlCenter");
const { db } = require("../lib/db");
const requestScope = require("../lib/requestScope");
const { logSecurityEvent } = require("../lib/securityLog");

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("internal closures that the register already scoped", () => {
  it("reads pusat memory again after the file is closed", () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "buzzard-mem-")), "memory.sqlite");
    const first = new Database(file);
    createDurable(first).putMemory({ ownerId: "pricing_ai", key: "note", value: { n: 7 } });
    first.close();

    const second = new Database(file);
    const store = createDurable(second);
    const own = store.getMemory({ ownerId: "pricing_ai", requesterId: "pricing_ai" });
    expect(own.ok).toBe(true);
    expect(own.records[0].value).toEqual({ n: 7 });
    expect(store.getMemory({ ownerId: "pricing_ai", requesterId: "stock_ai" }).code).toBe("PERSONAL_MEMORY_DENIED");
    second.close();
  });

  it("runs the storefront catalog read and keeps sales off", () => {
    const health = getHealth();
    expect(health.salesEnabled).toBe(false);
    expect(health.cache).toBeTypeOf("object");
    expect(health.productCount).toBeTypeOf("number");
  });

  it("keeps supplierOrdersEnabled false while sales are off", () => {
    const previousSupplier = process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED;
    const previousSales = process.env.BUZZARD_SALES_ENABLED;
    process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "1";
    process.env.BUZZARD_SALES_ENABLED = "0";
    try {
      expect(getEffectiveFlags().supplierOrdersEnabled).toBe(false);
    } finally {
      if (previousSupplier === undefined) delete process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED;
      else process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = previousSupplier;
      if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
      else process.env.BUZZARD_SALES_ENABLED = previousSales;
    }
  });

  it("writes an approval audit row that names the approval", () => {
    const approval = controlCenter.createApproval({
      reason: "internal-closure",
      riskLevel: "LOW",
    });
    const event = db
      .prepare(
        "SELECT event_type, resource_type, resource_id, summary FROM core_system_events WHERE resource_id = ?"
      )
      .get(approval.id);
    expect(event.event_type).toBe("approval.created");
    expect(event.resource_type).toBe("approval");
    expect(event.resource_id).toBe(approval.id);
    expect(event.summary).toContain("internal-closure");
  });

  it("stamps the security event with the request and correlation ids", () => {
    const entry = requestScope.run(
      { requestId: "req_internal_closure", correlationId: "corr_internal_closure" },
      () => logSecurityEvent({ type: "permission_denied", success: false, path: "/api/internal-closure" })
    );
    expect(entry.requestId).toBe("req_internal_closure");
    expect(entry.correlationId).toBe("corr_internal_closure");
  });

  it("reports provider diagnostics and health as not live", () => {
    const stdout = execFileSync(process.execPath, ["scripts/provider-diagnostics.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, BUZZARD_SALES_ENABLED: "0" },
    });
    const report = JSON.parse(stdout);
    expect(report.salesEnabled).toBe(false);
    expect(report.productionReady).toBe(false);
    expect(report.network).toBe(false);
    expect(report.live).toBe(false);
  });
});

describe("internal HTTP closures", () => {
  let api;

  beforeAll(async () => {
    api = await startIsolatedApi({
      roles: ["administrator"],
      env: { BUZZARD_SALES_ENABLED: "0", BUZZARD_TEST_MODE: "1" },
    });
  }, 60_000);

  afterAll(async () => {
    if (api) await api.stop();
  });

  it("denies another customer the cart, the checkout, and the order", async () => {
    const token = await api.login("administrator");
    const created = await api.request("POST", "/api/admin/pim-core/products", {
      token,
      body: {
        sku: `IDOR-${randomBytes(3).toString("hex")}`,
        title: "Idor",
        price: 12.5,
        stock: 4,
        status: "READY",
        visibility: "PUBLIC",
        currency: "EUR",
      },
    });
    const productId = created.json.product.id;
    const owner = await api.request("POST", "/api/auth/register", {
      body: {
        email: `owner-${randomBytes(3).toString("hex")}@isolated.example`,
        password: `Pw-${randomBytes(9).toString("base64url")}-4k`,
        name: "Owner",
      },
    });
    const other = await api.request("POST", "/api/auth/register", {
      body: {
        email: `other-${randomBytes(3).toString("hex")}@isolated.example`,
        password: `Pw-${randomBytes(9).toString("base64url")}-4k`,
        name: "Other",
      },
    });
    expect(owner.status).toBe(201);
    expect(other.status).toBe(201);
    const ownerId = String(owner.json.user.id);
    const cart = await api.request("POST", "/api/commerce/cart", {
      token: owner.json.token,
      body: { customerId: ownerId },
    });
    expect(cart.status).toBe(200);
    const cartId = cart.json.cart.id;
    const added = await api.request("POST", `/api/commerce/cart/${cartId}/items`, {
      token: owner.json.token,
      body: { productId, quantity: 1, customerId: ownerId },
    });
    expect(added.status).toBe(200);

    const foreignCart = await api.request("GET", `/api/commerce/cart/${cartId}`, { token: other.json.token });
    expect(foreignCart.status).toBe(403);
    const foreignAdd = await api.request("POST", `/api/commerce/cart/${cartId}/items`, {
      token: other.json.token,
      body: { productId, quantity: 1 },
    });
    expect(foreignAdd.status).toBe(403);
    const foreignStart = await api.request("POST", "/api/commerce/checkout/start", {
      token: other.json.token,
      body: { cartId, orderType: "DRY_RUN" },
    });
    expect(foreignStart.status).toBe(403);

    const ownStart = await api.request("POST", "/api/commerce/checkout/start", {
      token: owner.json.token,
      body: { cartId, orderType: "DRY_RUN" },
    });
    expect(ownStart.status).toBe(200);
    const checkoutId = ownStart.json.checkout.id;
    const foreignCheckout = await api.request("GET", `/api/commerce/checkout/${checkoutId}`, {
      token: other.json.token,
    });
    expect(foreignCheckout.status).toBe(403);
    const ownCheckout = await api.request("GET", `/api/commerce/checkout/${checkoutId}`, {
      token: owner.json.token,
    });
    expect(ownCheckout.status).toBe(200);

    const orderId = `ord_${randomBytes(4).toString("hex")}`;
    const marker = `marker-${randomBytes(3).toString("hex")}`;
    const stored = new Database(path.join(api.root, "catalog.sqlite"));
    stored
      .prepare("INSERT INTO commerce_orders(id, customer_id, items_json, metadata_json) VALUES (?, ?, ?, ?)")
      .run(orderId, ownerId, JSON.stringify([{ title: marker }]), "{}");
    stored.close();

    const foreignOrder = await api.request("GET", `/api/commerce/orders/${orderId}`, { token: other.json.token });
    expect(foreignOrder.status).toBe(403);
    expect(foreignOrder.text).not.toContain(marker);
    const ownOrder = await api.request("GET", `/api/commerce/orders/${orderId}`, { token: owner.json.token });
    expect(ownOrder.status).toBe(200);
    expect(ownOrder.text).toContain(marker);
  });

  it("does not let a client body mark an order or a payment as paid", async () => {
    const guest = await api.request("POST", "/api/orders", {
      body: { lines: [{ sku: "X", qty: 1 }], paid: true, paymentStatus: "paid", status: "PAID" },
    });
    expect(guest.status).toBe(403);
    expect(guest.json.code).toBe("sales_disabled");
    expect(guest.json.paid).not.toBe(true);
    expect(guest.json.orderNumber).toBeUndefined();

    const token = await api.login("administrator");
    const intent = await api.request("POST", "/api/payments-finance/intents", {
      token,
      body: {
        orderNumber: `BZ-${randomBytes(3).toString("hex")}`,
        amount: 10,
        currency: "EUR",
        paid: true,
        status: "succeeded",
      },
    });
    expect(intent.status).toBe(403);
    expect(intent.json.code).toBe("PAYMENT_NOT_LIVE");
    expect(intent.json.captured).toBe(false);
    expect(intent.json.realMoneyMovement).toBe(false);
    const stored = new Database(path.join(api.root, "catalog.sqlite"), { readonly: true });
    const paid = stored
      .prepare("SELECT COUNT(*) n FROM finance_payment_intents WHERE status IN ('succeeded', 'paid', 'PAID')")
      .get();
    stored.close();
    expect(paid.n).toBe(0);
  });

  it("returns the request id on the wire and keeps health offline", async () => {
    const health = await api.request("GET", "/api/health", {
      headers: { "x-request-id": "req_internal_closure" },
    });
    expect(health.status).toBe(200);
    expect(health.json.live).toBe(false);
    expect(health.headers.get("x-request-id")).toBe("req_internal_closure");

    const rejected = await api.request("GET", "/api/health", {
      headers: { "x-request-id": "bad id" },
    });
    expect(rejected.headers.get("x-request-id")).toMatch(/^[A-Za-z0-9_.:-]{1,64}$/);
    expect(rejected.headers.get("x-request-id")).not.toBe("bad id");
  });
});
