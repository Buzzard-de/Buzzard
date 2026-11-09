import { test, expect } from "@playwright/test";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

test.describe("Egress / sales safety (isolated; skip if API down)", () => {
  test("health exists and sales/stripe stay off when reachable", async ({ request }) => {
    const health = await request.get(`${API}/api/health`);
    if (!health.ok()) {
      test.skip(true, "API not running — LIVE_VERIFIED not claimed");
      return;
    }
    const body = await health.json().catch(() => ({}));
    expect(body.flags?.stripeEnabled ?? false).not.toBe(true);
    expect(body.flags?.paypalEnabled ?? false).not.toBe(true);
    expect(body.flags?.salesEnabled ?? false).not.toBe(true);
  });

  test("consent and payment flags stay closed", async ({ request }) => {
    const api = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");
    const health = await request.get(`${api}/api/health`);
    if (!health.ok()) {
      test.skip(true, "API not running — LIVE_VERIFIED not claimed");
      return;
    }
    const body = await health.json().catch(() => ({}));
    expect(body.flags?.consentDefault ?? false).not.toBe(true);
    expect(body.flags?.aiLive ?? false).not.toBe(true);
  });
});
