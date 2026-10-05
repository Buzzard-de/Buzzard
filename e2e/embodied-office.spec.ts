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

test.describe("embodied office isolation", () => {
  for (const size of phones) {
    test(`phone ${size.width}x${size.height} homepage is not a live avatar`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto("/");
      await expect(page.locator("[data-live-avatar=true]")).toHaveCount(0);
      await expect(page.locator("[data-pusat-office]")).toHaveCount(0);
    });
  }

  for (const size of desktops) {
    test(`desktop/tablet ${size.width}x${size.height} homepage stays isolated`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto("/");
      await expect(page.locator("[data-pusat-office]")).toHaveCount(0);
    });
  }

  test("office page never claims live human video", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pusat/office");
    const office = page.locator("[data-pusat-office]");
    await expect(office).toHaveAttribute("data-live-avatar", "false");
    await expect(office).toHaveAttribute("data-live-video", "false");
    await expect(office).toHaveAttribute("data-renderer", "CSS_3D_FALLBACK");
    for (const cam of ["FRONT", "BACK", "LEFT", "RIGHT", "OVERHEAD"]) {
      await page.locator(`[data-camera-btn=${cam}]`).click();
      await expect(page.locator(".pusat-office__room")).toHaveAttribute("data-camera", cam);
    }
  });
});
