import { test, expect } from "@playwright/test";
import { API_URL, adminCredentials } from "./support/admin";

/**
 * The admin login limiter allows 8 attempts per 15 minutes for one address and
 * e-mail; BUZZARD_TEST_MODE=1 switches it off. The account lockout (5 failed
 * passwords) stays on in both modes. scripts/isolated/e2e.sh --limiter on|off
 * starts the API in the mode named by BUZZARD_E2E_LIMITER.
 */
const mode = process.env.BUZZARD_E2E_LIMITER;
const account = adminCredentials("catalog_manager");
const lockTarget = adminCredentials("order_manager");

test.describe("Admin login limiter", () => {
  test.skip(mode !== "on" && mode !== "off", "limiter mode unknown: run through scripts/isolated/e2e.sh");
  test.skip(!account || !lockTarget, "synthetic role accounts required (BUZZARD_E2E_CREDENTIALS_FILE)");

  test("limiter on: the ninth login in the window is refused with 429", async ({ request }) => {
    test.skip(mode !== "on", "API runs with the limiter off");
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 9; attempt += 1) {
      const res = await request.post(`${API_URL}/api/admin/login`, { data: account! });
      statuses.push(res.status());
      if (attempt === 9) expect(await res.json()).toEqual({ success: false, errorKey: "admin.auth.rateLimited" });
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 429]);
  });

  test("limiter off: twelve logins in a row succeed", async ({ request }) => {
    test.skip(mode !== "off", "API runs with the limiter on");
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const res = await request.post(`${API_URL}/api/admin/login`, { data: account! });
      expect(res.status(), `attempt ${attempt}`).toBe(200);
    }
  });

  test("five wrong passwords lock the account in either mode", async ({ request }) => {
    const keys: string[] = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await request.post(`${API_URL}/api/admin/login`, {
        data: { email: lockTarget!.email, password: "wrong-password-value" },
      });
      keys.push((await res.json()).errorKey);
    }
    expect(keys).toEqual([
      "admin.auth.invalid",
      "admin.auth.invalid",
      "admin.auth.invalid",
      "admin.auth.invalid",
      "admin.auth.locked",
    ]);
    const locked = await request.post(`${API_URL}/api/admin/login`, { data: lockTarget! });
    expect(locked.status()).toBe(401);
    expect((await locked.json()).errorKey).toBe("admin.auth.locked");
  });
});
