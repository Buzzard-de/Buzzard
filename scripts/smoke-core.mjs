#!/usr/bin/env node
/**
 * Core API smoke test — auth, cart, orders, addresses.
 *
 * Usage:
 *   node scripts/smoke-core.mjs
 *   BUZZARD_API_URL=http://localhost:3001 node scripts/smoke-core.mjs
 */

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

let failed = 0;

function pass(label) {
  console.log(`  [OK] ${label}`);
}

function fail(label, detail = "") {
  console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed += 1;
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  console.log("Buzzard core API smoke test");
  console.log(`API: ${API}`);
  console.log("");

  const status = await request("/api/db/status");
  if (status.ok && status.body?.storage === "sqlite") {
    pass("SQLite database plugin");
  } else {
    fail("SQLite database plugin", `status ${status.status}`);
  }

  const health = await request("/api/health");
  if (health.ok) {
    pass("/api/health");
  } else {
    fail("/api/health", `status ${health.status}`);
  }

  const email = `smoke-${Date.now()}@buzzard.test`;
  const password = "SmokeTest1234!";

  const register = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name: "Smoke Test" }),
  });
  if (register.status === 201 && register.body?.token) {
    pass("Customer register");
  } else {
    fail("Customer register", register.body?.error || String(register.status));
  }

  const token = register.body?.token;
  const auth = { Authorization: `Bearer ${token}` };

  const me = await request("/api/me", { headers: auth });
  if (me.ok && me.body?.email === email) {
    pass("Authenticated /api/me");
  } else {
    fail("Authenticated /api/me", me.body?.error || String(me.status));
  }

  const address = await request("/api/customer/addresses", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      firstName: "Smoke",
      lastName: "Test",
      street: "Teststraße 1",
      zip: "10115",
      city: "Berlin",
      country: "DE",
    }),
  });
  if (address.status === 201 && address.body?.id) {
    pass("Create customer address");
  } else {
    fail("Create customer address", address.body?.error || String(address.status));
  }

  const profile = await request("/api/customer/profile", { headers: auth });
  if (profile.ok && Array.isArray(profile.body?.addresses) && profile.body.addresses.length >= 1) {
    pass("Customer profile with addresses");
  } else {
    fail("Customer profile with addresses");
  }

  const products = await request("/api/products");
  const productId = Array.isArray(products.body) ? products.body[0]?.id : null;
  if (!productId) {
    fail("Load products for cart test", "no active products");
  } else {
    pass("Load active products");

    const sku = products.body[0]?.sku;
    if (sku) {
      const bySku = await request(`/api/products/by-sku/${encodeURIComponent(sku)}`);
      if (bySku.ok && bySku.body?.sku === sku) {
        pass("Resolve product by SKU");
      } else {
        fail("Resolve product by SKU");
      }
    }

    const addCart = await request("/api/cart/items", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (addCart.ok) {
      pass("Add item to SQLite cart");
    } else {
      fail("Add item to SQLite cart", addCart.body?.error || String(addCart.status));
    }

    const cart = await request("/api/cart", { headers: auth });
    if (cart.ok && cart.body?.items?.length >= 1) {
      pass("Read SQLite cart");
    } else {
      fail("Read SQLite cart");
    }

    const patchCart = await request(`/api/cart/items/${productId}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ quantity: 2 }),
    });
    if (patchCart.ok) {
      pass("Update SQLite cart quantity");
    } else {
      fail("Update SQLite cart quantity", patchCart.body?.error || String(patchCart.status));
    }

    const syncCart = await request("/api/cart/sync", {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({
        items: [{ sku: products.body[0]?.sku, quantity: 3 }],
      }),
    });
    if (syncCart.ok && syncCart.body?.items?.length >= 1) {
      pass("Bulk sync SQLite cart");
    } else {
      fail("Bulk sync SQLite cart", syncCart.body?.error || String(syncCart.status));
    }

    const order = await request("/api/db/orders", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        countryCode: "DE",
        currency: "EUR",
        shippingAddress: { street: "Teststraße 1", city: "Berlin", zip: "10115", country: "DE" },
      }),
    });
    const salesOn = process.env.BUZZARD_SALES_ENABLED === "1";
    if (!salesOn) {
      if (order.status === 403 && order.body?.code === "sales_disabled") {
        pass("Order blocked in catalog mode (sales_disabled)");
      } else {
        fail("Order blocked in catalog mode", order.body?.error || String(order.status));
      }
    } else if (order.status === 201 && order.body?.orderNumber) {
      pass(`Create order ${order.body.orderNumber}`);
    } else {
      fail("Create order", order.body?.error || String(order.status));
    }

    const orders = await request("/api/db/orders", { headers: auth });
    if (orders.ok && Array.isArray(orders.body)) {
      pass("List customer orders");
    } else {
      fail("List customer orders");
    }

    const orderNumber = order.body?.orderNumber;
    if (salesOn && orderNumber) {
      const one = await request(`/api/db/orders/${encodeURIComponent(orderNumber)}`, { headers: auth });
      if (one.ok && one.body?.order_number === orderNumber) {
        pass("Fetch order by number");
      } else {
        fail("Fetch order by number");
      }
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@buzzard.de";
  const adminPassword = process.env.ADMIN_PASSWORD || "BuzzardAdmin2026!";
  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (adminLogin.ok && adminLogin.body?.user?.role === "admin") {
    pass("Admin login (SQLite JWT)");
  } else {
    fail("Admin login (SQLite JWT)", adminLogin.body?.error || "check ADMIN_EMAIL/ADMIN_PASSWORD");
  }

  const suggest = await request("/api/advanced-search/suggest?q=brem");
  if (suggest.ok && Array.isArray(suggest.body?.suggestions)) {
    pass("Advanced search suggest");
  } else {
    fail("Advanced search suggest", String(suggest.status));
  }

  const sku = products.body?.[0]?.sku;
  if (sku) {
    const reviews = await request(`/api/reviews-ratings/products/${encodeURIComponent(sku)}/reviews`);
    if (reviews.ok && reviews.body?.stats) {
      pass("Product reviews API");
    } else {
      fail("Product reviews API", String(reviews.status));
    }
  }

  const couponValidate = await request("/api/customer/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code: "WELCOME10", subtotal: 50 }),
  });
  if (couponValidate.ok && couponValidate.body?.valid) {
    pass("Coupon validation (WELCOME10)");
  } else {
    fail("Coupon validation", couponValidate.body?.error || String(couponValidate.status));
  }

  const paymentSession = await request("/api/payments/session", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ provider: "stripe", orderId: "SMOKE-001", amount: 19.99, currency: "EUR" }),
  });
  if (paymentSession.ok && paymentSession.body?.provider === "stripe") {
    pass("Payment session adapter (stripe, no keys)");
  } else {
    fail("Payment session adapter", paymentSession.body?.error || String(paymentSession.status));
  }

  console.log("");
  if (failed > 0) {
    console.error(`${failed} smoke check(s) failed.`);
    process.exit(1);
  }
  console.log("All core smoke checks passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
