import { test, expect } from "@playwright/test";

test.describe("mobile and Arabic landing", () => {
  test("home and Arabic prefix stay usable on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const home = await page.goto("/");
    expect(home?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    const box = await page.locator("body").boundingBox();
    expect(box?.width || 0).toBeLessThanOrEqual(375);

    const ar = await page.goto("/ar/");
    expect(ar?.status() ?? 200).toBeLessThan(500);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toContain("lebensmittel-und-getraenke");
  });
});
