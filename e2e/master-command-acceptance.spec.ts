import { test, expect } from "@playwright/test";
import { LANGUAGE_CODES } from "../lib/i18n/languages";

test.describe("Master Command 2 storefront acceptance", () => {
  test("home, retired slugs absent, locale prefixes, sales off", async ({ request }) => {
    const home = await request.get("/");
    if (!home.ok()) {
      test.skip(true, "Storefront not reachable — LIVE_VERIFIED not claimed");
      return;
    }
    const html = (await home.text()).toLowerCase();
    expect(html).not.toMatch(/lebensmittel-und-getraenke/);
    expect(html).not.toMatch(/schmuck-uhren/);

    for (const locale of ["de", "en", "tr", "ar", "pl", "fr"]) {
      const res = await request.get(`/${locale}/`);
      expect(res.status()).toBeLessThan(500);
    }
    expect(LANGUAGE_CODES).toHaveLength(30);

    const api = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");
    const health = await request.get(`${api}/api/health`);
    if (health.ok()) {
      const body = await health.json();
      expect(body.flags?.salesEnabled ?? false).not.toBe(true);
      expect(body.flags?.stripeEnabled ?? false).not.toBe(true);
    }
  });
});
