import { test, expect } from "@playwright/test";
import { adminCredentials } from "./support/admin";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

test.describe("Commerce Readiness Part 8", () => {
  test("commerce health shows sales disabled", async ({ request }) => {
    const res = await request.get(`${API}/api/health/commerce`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.health.sales.salesEnabled).toBe(false);
  });

  test("critical: commercial checkout attempt produces zero commercial orders", async ({ request }) => {
    const res = await request.post(`${API}/api/commerce/checkout/attempt`, {
      data: { orderType: "COMMERCIAL", idempotencyKey: `e2e-${Date.now()}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.commercialOrders).toBe(0);
    expect(body.salesEnabled).toBe(false);
    expect(body.realPayment).toBe(false);
    expect(body.supplierOrders).toBe(0);
  });

  test("admin control center commerce API", async ({ request }) => {
    const credentials = adminCredentials("administrator");
    test.skip(!credentials, "Admin credentials unavailable (BUZZARD_ADMIN_EMAIL / BUZZARD_ADMIN_PASSWORD)");
    const login = await request.post(`${API}/api/admin/login`, {
      data: credentials!,
    });
    expect(login.status()).toBe(200);
    const token = (await login.json()).token;

    const overview = await request.get(`${API}/api/admin/commerce/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(overview.ok()).toBeTruthy();
    const body = await overview.json();
    expect(body.flags.salesEnabled).toBe(false);
    expect(body.readiness.checks.length).toBeGreaterThan(10);
  });
});
