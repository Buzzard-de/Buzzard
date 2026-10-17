import { test, expect } from "@playwright/test";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");
const SITE = (process.env.BUZZARD_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

async function firstPublicCatalogItem(request: import("@playwright/test").APIRequestContext) {
  const catalog = await request.get(`${API}/api/catalog/products?page=1&limit=5`);
  const items = (await catalog.json()).items || [];
  return items.find((item: { id?: string; price?: number }) => item?.id && Number(item.price) > 0) || null;
}

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
    const product = await firstPublicCatalogItem(request);
    const productId = product?.id;
    expect(productId).toBeTruthy();

    const sessionId = `e2e-p9-${Date.now()}`;
    const cartRes = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId, country: "DE" },
    });
    const cartBody = await cartRes.json();
    expect(cartBody.cart?.id).toBeTruthy();

    const addRes = await request.post(`${API}/api/commerce/cart/${cartBody.cart.id}/items`, {
      data: { productId, quantity: 1, sessionId },
    });
    expect(addRes.ok()).toBeTruthy();
    const addBody = await addRes.json();
    expect(addBody.items?.length).toBeGreaterThan(0);
    expect(addBody.items[0].priceSnapshot).toBeGreaterThan(0);
  });

  test("READINESS_TEST order via API (storefront backend path)", async ({ request }) => {
    const product = await firstPublicCatalogItem(request);
    const productId = product?.id;
    const sessionId = `e2e-readiness-${Date.now()}`;
    const cart = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId },
    });
    const cartId = (await cart.json()).cart.id;
    await request.post(`${API}/api/commerce/cart/${cartId}/items`, {
      data: { productId, quantity: 1, sessionId },
    });

    const start = await request.post(`${API}/api/commerce/checkout/start`, {
      data: { cartId, orderType: "READINESS_TEST", sessionId },
    });
    const checkoutId = (await start.json()).checkout.id;
    const addr = { line1: "E2E 1", city: "Berlin", postalCode: "10115", country: "DE" };
    await request.post(`${API}/api/commerce/checkout/${checkoutId}/validate`, {
      data: { billingAddress: addr, shippingAddress: addr, sessionId },
    });
    const complete = await request.post(`${API}/api/commerce/checkout/${checkoutId}/complete`, {
      data: { orderType: "READINESS_TEST", sessionId },
      headers: { "Idempotency-Key": `e2e-complete-${Date.now()}` },
    });
    const result = await complete.json();
    expect(complete.ok()).toBeTruthy();
    expect(result.order?.orderType).toBe("READINESS_TEST");
    expect(result.payment?.realMoneyMovement).toBe(false);
  });
});
