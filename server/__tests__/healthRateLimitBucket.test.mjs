import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

/**
 * /api/health uses the existing limiter with its own key prefix. These requests
 * run against a temp database. Sales stay off.
 */
const HEALTH_BUDGET = 240;
const API_BUDGET = 180;

function client(ip) {
  return { "x-forwarded-for": ip };
}

describe("health rate-limit bucket", () => {
  let api;

  beforeAll(async () => {
    api = await startIsolatedApi({
      seed: false,
      env: {
        BUZZARD_TEST_MODE: undefined,
        BUZZARD_RATE_LIMIT_DISABLED: undefined,
        BUZZARD_SALES_ENABLED: "0",
        BUZZARD_SALES_GATE_BYPASS: undefined,
      },
    });
  }, 60_000);

  afterAll(async () => {
    await api?.stop();
  });

  async function drain(route, ip, budget) {
    let allowed = 0;
    let limited = null;
    for (let i = 0; i < budget + 5; i += 1) {
      const res = await api.request("GET", route, { headers: client(ip) });
      if (res.status === 429) {
        limited = res;
        break;
      }
      allowed += 1;
      expect(res.status).toBe(200);
    }
    return { allowed, limited };
  }

  it("keeps health probes out of the user bucket, caps a flood, and answers errors without internals", async () => {
    const healthIp = "203.0.113.10";
    const userIp = "203.0.113.20";
    const errorIp = "203.0.113.30";

    const opened = [];
    for (let i = 0; i < 30; i += 1) opened.push(api.request("GET", "/api/health", { headers: client(healthIp) }));
    opened.push(api.request("GET", "/api/status", { headers: client(healthIp) }));
    const firstWave = await Promise.all(opened);
    const healthOpened = firstWave.slice(0, 30);
    expect(healthOpened.every((res) => res.status === 200)).toBe(true);
    expect(firstWave[30].status).toBe(200);
    expect(firstWave[30].json.health).toBe("/api/health");

    const health = await drain("/api/health", healthIp, HEALTH_BUDGET);
    expect(health.allowed).toBe(HEALTH_BUDGET - 30);
    expect(health.limited.status).toBe(429);
    expect(health.limited.json).toEqual({ success: false, errorKey: "security.rateLimited" });
    expect(health.limited.text).not.toMatch(/stack|Error:|node_modules|\/workspace/);

    const blocked = await Promise.all(
      Array.from({ length: 20 }, () => api.request("GET", "/api/health/not-a-probe", { headers: client(healthIp) }))
    );
    expect(blocked.every((res) => res.status === 429)).toBe(true);
    expect(blocked.every((res) => res.json.errorKey === "security.rateLimited")).toBe(true);

    const userAfterHealthFlood = await api.request("GET", "/api/status", { headers: client(healthIp) });
    expect(userAfterHealthFlood.status).toBe(200);

    const user = await drain("/api/status", userIp, API_BUDGET);
    expect(user.allowed).toBe(API_BUDGET);
    expect(user.limited.json).toEqual({ success: false, errorKey: "security.rateLimited" });

    const healthAfterUserFlood = await api.request("GET", "/api/health", { headers: client(userIp) });
    expect(healthAfterUserFlood.status).toBe(200);
    expect(healthAfterUserFlood.json).toMatchObject({ success: true, ok: true, live: false });

    const broken = await api.request("POST", "/api/admin/login", {
      headers: { ...client(errorIp), "Content-Type": "application/json" },
      raw: "{",
    });
    expect(broken.status).toBe(400);
    expect(broken.json).toEqual({ success: false, errorKey: "security.invalidJson" });
  }, 60_000);
});
