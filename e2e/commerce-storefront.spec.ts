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
    const catalog = await request.get(`${API}/api/catalog/products?q=BZ-CORE&limit=1`);
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
    expect(addRes.ok()).toBeTruthy();
    const addBody = await addRes.json();
    expect(addBody.items?.length).toBeGreaterThan(0);
    expect(addBody.items[0].priceSnapshot).toBeGreaterThan(0);
  });

  test("READINESS_TEST order via API (storefront backend path)", async ({ request }) => {
    const catalog = await request.get(`${API}/api/catalog/products?q=BZ-CORE&limit=1`);
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
    const checkoutId = (await start.json()).checkout.id;
    const addr = { line1: "E2E 1", city: "Berlin", postalCode: "10115", country: "DE" };
    await request.post(`${API}/api/commerce/checkout/${checkoutId}/validate`, {
      data: { billingAddress: addr, shippingAddress: addr },
    });
    const complete = await request.post(`${API}/api/commerce/checkout/${checkoutId}/complete`, {
      data: { orderType: "READINESS_TEST" },
      headers: { "Idempotency-Key": `e2e-complete-${Date.now()}` },
    });
    const result = await complete.json();
    expect(complete.ok()).toBeTruthy();
    expect(result.order?.orderType).toBe("READINESS_TEST");
    expect(result.payment?.realMoneyMovement).toBe(false);
  });
});
