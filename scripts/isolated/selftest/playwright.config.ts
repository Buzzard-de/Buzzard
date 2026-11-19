import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * Used by scripts/isolated/selftest.sh only: the real global setup in front of
 * one spec that touches nothing, to see whether the setup lets a run start.
 */
export default defineConfig({
  testDir: __dirname,
  testMatch: /noop\.spec\.ts/,
  globalSetup: path.join(__dirname, "..", "..", "..", "e2e", "global-setup.ts"),
  workers: 1,
  reporter: "line",
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL },
});
