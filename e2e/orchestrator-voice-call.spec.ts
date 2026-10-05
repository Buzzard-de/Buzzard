import { expect, test } from "@playwright/test";

const phones = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
];

const desktops = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

test.describe("orchestrator voice/call isolation", () => {
  for (const size of phones) {
    test(`phone ${size.width}x${size.height} keeps homepage isolation`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto("/");
      const connected = page.locator("[data-orch-voice] [data-state=CONNECTED]");
      await expect(connected).toHaveCount(0);
    });
  }

  for (const size of desktops) {
    test(`desktop/tablet ${size.width}x${size.height} does not fake a call`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto("/");
      await expect(page.locator("[data-orch-call] [data-state=CONNECTED]")).toHaveCount(0);
    });
  }

  test("admin login layout is not replaced by voice chrome", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin/login");
    await expect(page.locator("body")).not.toHaveClass(/orch-voice-shell/);
  });
});
