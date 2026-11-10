import { test, expect } from "@playwright/test";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

async function visibleProduct(request: import("@playwright/test").APIRequestContext) {
  const catalog = await request.get(`${API}/api/catalog/products?limit=1`);
  const item = (await catalog.json()).items?.[0];
  expect(item?.id).toBeTruthy();
  return item as { id: string; price?: number };
}

function quantityForSubtotal(price: number | undefined, minimum = 30) {
  const unit = Number(price) > 0 ? Number(price) : 20;
  return Math.max(2, Math.ceil(minimum / unit));
}

test.describe("Part 10 — Commerce safety E2E", () => {
  test("COMMERCIAL checkout blocked with SALES=0", async ({ request }) => {
    const res = await request.post(`${API}/api/commerce/checkout/attempt`, {
      data: { orderType: "COMMERCIAL", idempotencyKey: `e2e-p10-${Date.now()}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.commercialOrders).toBe(0);
    expect(body.realPayment).toBe(false);
    expect(body.supplierOrders).toBe(0);
    expect(body.salesEnabled).toBe(false);
  });

  test("price tampering rejected", async ({ request }) => {
    const product = await visibleProduct(request);
    const productId = product.id;
    const cart = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `e2e-tamper-${Date.now()}` },
    });
    const cartId = (await cart.json()).cart.id;
    const add = await request.post(`${API}/api/commerce/cart/${cartId}/items`, {
      data: { productId, quantity: 1, clientPrice: 0.01 },
    });
    expect(add.ok()).toBeFalsy();
    const body = await add.json();
    expect(body.errorKey).toBe("price_tampering");
  });

  test("coupon tampering rejected", async ({ request }) => {
    const product = await visibleProduct(request);
    const productId = product.id;
    const cart = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `e2e-coupon-${Date.now()}` },
    });
    const cartId = (await cart.json()).cart.id;
    await request.post(`${API}/api/commerce/cart/${cartId}/items`, {
      data: { productId, quantity: quantityForSubtotal(product.price) },
    });

    const tamper = await request.post(`${API}/api/commerce/cart/${cartId}/coupon`, {
      data: { couponCode: "WELCOME10", clientDiscount: 999 },
    });
    expect(tamper.ok()).toBeFalsy();
    const body = await tamper.json();
    expect(body.errorKey).toBe("coupon_tampering");
  });

  test("server coupon validation authoritative", async ({ request }) => {
    const cart = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `e2e-coupon-valid-${Date.now()}` },
    });
    const cartId = (await cart.json()).cart.id;
    const product = await visibleProduct(request);
    const productId = product.id;
    await request.post(`${API}/api/commerce/cart/${cartId}/items`, {
      data: { productId, quantity: quantityForSubtotal(product.price) },
    });

    const apply = await request.post(`${API}/api/commerce/cart/${cartId}/coupon`, {
      data: { couponCode: "WELCOME10" },
    });
    expect(apply.ok()).toBeTruthy();
    const applied = await apply.json();
    expect(applied.discount).toBeGreaterThan(0);
    expect(applied.cart?.couponCode).toBe("WELCOME10");
  });

  test("IDOR — customer cannot access foreign cart", async ({ request }) => {
    const cartA = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `idor-a-${Date.now()}`, customerId: "cust_a" },
    });
    if (!cartA.ok()) {
      test.skip(true, "rate limited or cart create failed");
      return;
    }
    const cartId = (await cartA.json()).cart?.id;
    expect(cartId).toBeTruthy();

    const foreign = await request.get(`${API}/api/commerce/cart/${cartId}?customerId=cust_b`);
    expect([403, 404]).toContain(foreign.status());
  });

  test("duplicate checkout submit uses idempotency", async ({ request }) => {
    const product = await visibleProduct(request);
    const productId = product.id;
    const cart = await request.post(`${API}/api/commerce/cart`, {
      data: { sessionId: `e2e-idem-${Date.now()}` },
    });
    const cartId = (await cart.json()).cart.id;
    await request.post(`${API}/api/commerce/cart/${cartId}/items`, { data: { productId, quantity: 1 } });

    const start = await request.post(`${API}/api/commerce/checkout/start`, {
      data: { cartId, orderType: "READINESS_TEST" },
    });
    const checkoutId = (await start.json()).checkout.id;
    const addr = { line1: "Test 1", city: "Berlin", postalCode: "10115", country: "DE" };
    await request.post(`${API}/api/commerce/checkout/${checkoutId}/validate`, {
      data: { billingAddress: addr, shippingAddress: addr },
    });

    const key = `e2e-idem-${Date.now()}`;
    const first = await request.post(`${API}/api/commerce/checkout/${checkoutId}/complete`, {
      data: { orderType: "READINESS_TEST" },
      headers: { "Idempotency-Key": key },
    });
    expect(first.ok()).toBeTruthy();

    const second = await request.post(`${API}/api/commerce/checkout/${checkoutId}/complete`, {
      data: { orderType: "READINESS_TEST" },
      headers: { "Idempotency-Key": key },
    });
    const secondBody = await second.json();
    expect(second.ok() || secondBody.idempotencyReplay).toBeTruthy();
  });
});
