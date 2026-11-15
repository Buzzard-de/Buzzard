import { test, expect } from "@playwright/test";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");
const SITE = (process.env.BUZZARD_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

test.describe("Storefront Commerce Bridge Part 9", () => {
  test("critical API: commercial checkout blocked with sales off", async ({ request }) => {
    const res = await request.post(`${API}/api/commerce/checkout/attempt`, {
      data: { orderType: "COMMERCIAL", idempotencyKey: `e2e-p9-${Date.now()}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.commercialOrders).toBe(0);
    expect(body.realPayment).toBe(false);
    expect(body.supplierOrders).toBe(0);
  });

  test("storefront cart API round-trip", async ({ request }) => {
    const catalog = await request.get(`${API}/api/catalog/products?limit=1`);
    const catalogBody = await catalog.json();
    const productId = catalogBody.items?.[0]?.id;
    expect(productId).toBeTruthy();

    const cartRes = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `e2e-p9-${Date.now()}`, country: "DE" },
    });
    const cartBody = await cartRes.json();
    expect(cartBody.cart?.id).toBeTruthy();

    const addRes = await request.post(`${API}/api/commerce/cart/${cartBody.cart.id}/items`, {
      data: { productId, quantity: 1 },
    });
    expect(addRes.ok()).toBeFalsy();
    const addBody = await addRes.json();
    expect(addBody.errorKey).toBe("SALES_CLOSED");
    expect(addBody.stored).toBe(false);
    expect(addBody.purchased).toBe(false);
    expect(addBody.checkoutAllowed).toBe(false);
  });

  test("READINESS_TEST checkout stays blocked without a verified price", async ({ request }) => {
    const catalog = await request.get(`${API}/api/catalog/products?limit=1`);
    const productId = (await catalog.json()).items?.[0]?.id;
    const cart = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `e2e-readiness-${Date.now()}` },
    });
    const cartId = (await cart.json()).cart.id;
    await request.post(`${API}/api/commerce/cart/${cartId}/items`, {
      data: { productId, quantity: 1 },
    });

    const start = await request.post(`${API}/api/commerce/checkout/start`, {
      data: { cartId, orderType: "READINESS_TEST" },
    });
    const started = await start.json();
    expect(start.status()).toBe(403);
    expect(started.errorKey).toBe("SALES_CLOSED");
    expect(started.checkoutCreated).toBe(false);
    expect(started.orderCreated).toBe(false);
    expect(started.paymentAuthorized).toBe(false);
    expect(started.checkout).toBeUndefined();
  });
});
