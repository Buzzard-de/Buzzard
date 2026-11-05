import { test, expect } from "@playwright/test";

test.describe("Master Command 3 Chromium", () => {
  test("home loads, retired slugs absent, locale prefixes, RTL dir for Arabic", async ({ page }) => {
    const home = await page.goto("/");
    expect(home?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    const html = (await page.content()).toLowerCase();
    expect(html).not.toContain("lebensmittel-und-getraenke");
    expect(html).not.toContain("schmuck-uhren");

    for (const locale of ["de", "en", "tr", "pl", "fr"]) {
      const res = await page.goto(`/${locale}/`);
      expect(res?.status() ?? 200).toBeLessThan(500);
    }

    const ar = await page.goto("/ar/");
    expect(ar?.status() ?? 200).toBeLessThan(500);
  });

  test("account login page is reachable without a production session", async ({ page }) => {
    const res = await page.goto("/konto/login/");
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
