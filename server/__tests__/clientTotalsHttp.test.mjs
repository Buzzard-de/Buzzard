import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const { publicError } = require("../core/errors");

let api;

beforeAll(async () => {
  api = await startIsolatedApi({
    roles: ["administrator"],
    env: { BUZZARD_SALES_ENABLED: "0", BUZZARD_TEST_MODE: "1" },
  });
}, 60_000);

afterAll(async () => {
  await api?.stop();
});

describe("checkout rejects client totals without leaking internals", () => {
  it("returns only the public error contract from the shared helper", () => {
    const body = publicError("Error: secret at /workspace/server/lib/db.js:10", "security.internalError", 500, {
      stack: "Error\n    at hidden",
      sql: "SELECT * FROM users",
    });
    expect(body).toEqual({ success: false, errorKey: "security.internalError" });
  });

  it("rejects a client total on the checkout route and keeps the error body public", async () => {
    const admin = await api.login("administrator");
    const created = await api.request("POST", "/api/admin/pim-core/products", {
      token: admin,
      body: {
        sku: `BZ15${randomBytes(3).toString("hex")}`,
        title: "Pruefblech",
        description: "Isolated plate for the client total test.",
        price: 12.5,
        stock: 5,
        status: "READY",
        visibility: "PUBLIC",
        currency: "EUR",
      },
    });
    expect(created.status).toBe(201);

    const registered = await api.request("POST", "/api/auth/register", {
      body: {
        email: `totals-${randomBytes(4).toString("hex")}@isolated.example`,
        password: `Pw-${randomBytes(9).toString("base64url")}-4k`,
        name: "Isolated Buyer",
      },
    });
    expect(registered.status).toBe(201);
    const token = registered.json.token;
    const customerId = String(registered.json.user.id);

    const cart = await api.request("POST", "/api/commerce/cart", { token, body: { customerId } });
    expect(cart.status).toBe(200);
    const added = await api.request("POST", `/api/commerce/cart/${cart.json.cart.id}/items`, {
      token,
      body: { productId: created.json.product.id, quantity: 1, customerId },
    });
    expect(added.status).toBe(200);
    const checkout = await api.request("POST", "/api/commerce/checkout/start", {
      token,
      body: { cartId: cart.json.cart.id, orderType: "DRY_RUN" },
    });
    expect(checkout.status).toBe(200);

    const rejected = await api.request("POST", `/api/commerce/checkout/${checkout.json.checkout.id}/validate`, {
      token,
      body: { total: 1, subtotal: 1, tax: 0 },
    });
    expect(rejected.status).toBe(400);
    expect(rejected.json.errorKey).toBe("client_totals_rejected");
    expect(rejected.json.success).toBe(false);
    expect(rejected.text).not.toMatch(/stack|node_modules|\/workspace|\/home\/|SELECT /);

    const broken = await api.request("POST", `/api/commerce/checkout/${checkout.json.checkout.id}/validate`, {
      token,
      headers: { "Content-Type": "application/json" },
      raw: "{",
    });
    expect(broken.status).toBe(400);
    expect(broken.json).toEqual({ success: false, errorKey: "security.invalidJson" });
  });
});
