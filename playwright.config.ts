import { defineConfig, devices } from "@playwright/test";

const VIEWPORTS = {
  desktop1280: { width: 1280, height: 720 },
  desktop1440: { width: 1440, height: 900 },
  desktop1920: { width: 1920, height: 1080 },
  mobile320: { width: 320, height: 844 },
  mobile360: { width: 360, height: 800 },
  mobile375: { width: 375, height: 812 },
  mobile390: { width: 390, height: 844 },
  mobile414: { width: 414, height: 896 },
  tablet768: { width: 768, height: 1024 },
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "api",
      testMatch: /commerce-(storefront|security)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-desktop",
      testMatch: /customer-journey|admin\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORTS.desktop1280 },
    },
    {
      name: "chromium-mobile",
      testMatch: /customer-journey\.spec\.ts/,
      use: { ...devices["Pixel 5"], viewport: VIEWPORTS.mobile375 },
    },
    {
      name: "chromium-tablet",
      testMatch: /customer-journey\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORTS.tablet768 },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "node scripts/e2e-webserver.mjs",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});

export { VIEWPORTS };
