import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

let api;

beforeAll(async () => {
  api = await startIsolatedApi({ roles: ["administrator"] });
}, 60_000);

afterAll(async () => {
  await api?.stop();
});

async function sellableProduct() {
  const token = await api.login("administrator");
  const created = await api.request("POST", "/api/admin/pim-core/products", {
    token,
    body: {
      sku: `BZ16${randomBytes(3).toString("hex")}`,
      title: "Regalblech Satz",
      description: "Isolated shelf plate for the guest closure test.",
      price: 12.5,
      stock: 5,
      status: "READY",
      visibility: "PUBLIC",
      currency: "EUR",
    },
  });
  expect(created.status).toBe(201);
  return created.json.product.id;
}

describe("guest commerce fail-closed", () => {
  it("refuses a cart delete before it writes, including a cart that names a customer", async () => {
    const productId = await sellableProduct();
    const registered = await api.request("POST", "/api/auth/register", {
      body: {
        email: `guest-${randomBytes(4).toString("hex")}@isolated.example`,
        password: `Pw-${randomBytes(9).toString("base64url")}-4k`,
        name: "Isolated Guest",
      },
    });
    expect(registered.status).toBe(201);
    const customerId = String(registered.json.user.id);
    const token = registered.json.token;

    const anonymousCart = await api.request("POST", "/api/commerce/cart", { body: { customerId } });
    expect(anonymousCart.status).toBe(401);
    expect(anonymousCart.json.errorKey).toBe("auth_required");

    const owned = await api.request("POST", "/api/commerce/cart", { token, body: { customerId } });
    expect(owned.status).toBe(200);
    const cartId = owned.json.cart.id;
    const added = await api.request("POST", `/api/commerce/cart/${cartId}/items`, {
      token,
      body: { productId, quantity: 1, customerId },
    });
    expect(added.status).toBe(200);
    const itemId = added.json.items[0].id;
    const commercial = await api.request("POST", "/api/commerce/checkout/start", {
      token,
      body: { cartId, orderType: "COMMERCIAL" },
    });
    expect(commercial.status).toBe(403);
    expect(commercial.json.errorKey).toBe("sales_disabled");

    const denied = await api.request("DELETE", `/api/commerce/cart/${cartId}/items/${itemId}`, {
      body: { customerId: "someone-else" },
    });
    expect(denied.status).toBe(401);
    expect(denied.json.errorKey).toBe("auth_required");
    const hidden = await api.request("GET", `/api/commerce/cart/${cartId}?customerId=${customerId}`);
    expect(hidden.status).toBe(401);
    const stillThere = await api.request("GET", `/api/commerce/cart/${cartId}`, { token });
    expect(stillThere.status).toBe(200);
    expect(stillThere.json.itemCount).toBe(1);

    const removed = await api.request("DELETE", `/api/commerce/cart/${cartId}/items/${itemId}`, {
      token,
      body: { customerId },
    });
    expect(removed.status).toBe(200);
    expect(removed.json.itemCount).toBe(0);
  });

  it("does not delete an identity-less cart and does not open a checkout without a credential", async () => {
    const productId = await sellableProduct();
    const opened = await api.request("POST", "/api/commerce/cart", { body: { country: "DE" } });
    expect(opened.status).toBe(401);

    const db = new Database(`${api.root}/catalog.sqlite`);
    const cartId = `cart_${randomBytes(4).toString("hex")}`;
    const itemId = `ci_${randomBytes(4).toString("hex")}`;
    db.prepare(
      "INSERT INTO commerce_carts(id, customer_id, session_id, country, currency, status) VALUES (?, NULL, NULL, 'DE', 'EUR', 'active')"
    ).run(cartId);
    db.prepare(
      "INSERT INTO commerce_cart_items(id, cart_id, product_id, quantity, price_snapshot, currency) VALUES (?, ?, ?, 1, 12.5, 'EUR')"
    ).run(itemId, cartId, productId);
    db.close();

    const denied = await api.request("DELETE", `/api/commerce/cart/${cartId}/items/${itemId}`);
    expect(denied.status).toBe(401);
    const hidden = await api.request("GET", `/api/commerce/cart/${cartId}`);
    expect(hidden.status).toBe(401);
    const after = new Database(`${api.root}/catalog.sqlite`, { readonly: true });
    const remaining = after.prepare("SELECT COUNT(*) n FROM commerce_cart_items WHERE id = ?").get(itemId).n;
    after.close();
    expect(remaining).toBe(1);

    const checkout = await api.request("POST", "/api/commerce/checkout/start", {
      body: { cartId, orderType: "DRY_RUN" },
    });
    expect(checkout.status).toBe(401);
    expect(checkout.json.errorKey).toBe("auth_required");
    const commercial = await api.request("POST", "/api/commerce/checkout/start", {
      body: { cartId, orderType: "COMMERCIAL" },
    });
    expect(commercial.status).toBe(401);

    const stored = new Database(`${api.root}/catalog.sqlite`, { readonly: true });
    const checkouts = stored.prepare("SELECT COUNT(*) n FROM commerce_checkouts WHERE cart_id = ?").get(cartId).n;
    stored.close();
    expect(checkouts).toBe(0);
  });

  it("does not return an identity-less checkout or order over HTTP", async () => {
    const marker = `marker-${randomBytes(4).toString("hex")}`;
    const db = new Database(`${api.root}/catalog.sqlite`);
    db.prepare(
      "INSERT INTO commerce_checkouts(id, cart_id, customer_id, billing_json, shipping_json) VALUES (?, ?, NULL, ?, ?)"
    ).run("chk_identityless", "cart_identityless", JSON.stringify({ line1: marker }), JSON.stringify({ address: { line1: marker } }));
    db.prepare(
      "INSERT INTO commerce_orders(id, customer_id, items_json, metadata_json) VALUES (?, NULL, ?, ?)"
    ).run("ord_identityless", JSON.stringify([{ title: marker }]), "{}");
    db.close();

    const checkout = await api.request("GET", "/api/commerce/checkout/chk_identityless");
    const order = await api.request("GET", "/api/commerce/orders/ord_identityless");
    expect(checkout.status).toBe(401);
    expect(order.status).toBe(401);
    expect(checkout.text).not.toContain(marker);
    expect(order.text).not.toContain(marker);

    const registered = await api.request("POST", "/api/auth/register", {
      body: {
        email: `reader-${randomBytes(4).toString("hex")}@isolated.example`,
        password: `Pw-${randomBytes(9).toString("base64url")}-4k`,
        name: "Isolated Reader",
      },
    });
    const withToken = await api.request("GET", "/api/commerce/orders/ord_identityless", { token: registered.json.token });
    expect(withToken.status).toBe(401);
    expect(withToken.text).not.toContain(marker);
  });

  it("refuses the legacy cart and the checkout attempt when no credential is present", async () => {
    const before = new Database(`${api.root}/catalog.sqlite`, { readonly: true });
    const cartsBefore = before.prepare("SELECT COUNT(*) n FROM cc_carts").get().n;
    const commerceBefore = before.prepare("SELECT COUNT(*) n FROM commerce_carts").get().n;
    before.close();

    const legacy = await api.request("POST", "/api/cart-checkout/carts", { body: { country: "DE" } });
    expect(legacy.status).toBe(401);
    expect(legacy.json.errorKey).toBe("auth_required");
    const legacyRead = await api.request("GET", "/api/cart-checkout/carts/not-a-session");
    expect(legacyRead.status).toBe(401);
    const attempt = await api.request("POST", "/api/commerce/checkout/attempt", { body: { orderType: "COMMERCIAL" } });
    expect(attempt.status).toBe(401);
    expect(attempt.json.errorKey).toBe("auth_required");

    const after = new Database(`${api.root}/catalog.sqlite`, { readonly: true });
    expect(after.prepare("SELECT COUNT(*) n FROM cc_carts").get().n).toBe(cartsBefore);
    expect(after.prepare("SELECT COUNT(*) n FROM commerce_carts").get().n).toBe(commerceBefore);
    after.close();
  });
});
