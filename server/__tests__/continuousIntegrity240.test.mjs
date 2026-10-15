import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("item 31 — productionHealth probe failures", () => {
  it("does not return exception text, SQL, or paths from probeFailure", () => {
    const { probeFailure, publicProbeError } = require("../lib/productionHealth.js");
    const err = new Error("SQLITE_ERROR: no such table /var/data/buzzard.db");
    err.code = "SQLITE_ERROR";
    const worker = probeFailure("worker", err, { enabled: false, status: "ERROR" });
    expect(worker.errorKey).toBe("health.workerFailed");
    expect(worker.status).toBe("ERROR");
    expect(JSON.stringify(worker)).not.toContain("SQLITE_ERROR: no such table");
    expect(JSON.stringify(worker)).not.toContain("/var/data");
    expect(worker.error).toBeUndefined();
    expect(publicProbeError("ECONNREFUSED 127.0.0.1:6379")).toBe("health.probeFailed");
    expect(publicProbeError("not_configured")).toBe("not_configured");
    expect(publicProbeError("redis.failed")).toBe("redis.failed");
  });

  it("source no longer assigns err.message onto health payloads", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/productionHealth.js"), "utf8");
    expect(src).not.toMatch(/error:\s*err\.message/);
    expect(src).not.toMatch(/error:\s*health\.error(?!\))/);
  });

  it("public version payload stays slim", () => {
    const { getVersionPayload } = require("../lib/productionHealth.js");
    const identity = getVersionPayload();
    expect(identity).toHaveProperty("service");
    expect(identity).toHaveProperty("commit");
    expect(JSON.stringify(identity)).not.toMatch(/sk_live_|BEGIN PRIVATE/);
  });

  it("production summary keeps sales lock and has no exception-shaped error strings", async () => {
    const { getProductionSummary, getWorkerHealth } = require("../lib/productionHealth.js");
    const summary = await getProductionSummary();
    expect(summary.commerce.salesEnabled).toBe(false);
    expect(summary.goLiveLock).toBe(true);
    const blob = JSON.stringify(summary);
    expect(blob).not.toMatch(/SQLITE_ERROR/);
    expect(blob).not.toMatch(/at Object\./);
    const worker = getWorkerHealth();
    expect(worker).toHaveProperty("status");
    expect(worker.error).toBeUndefined();
  });
});

describe("redis healthCheck public error keys", () => {
  it("maps failures to redis.failed rather than exception text", async () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/redisClient.js"), "utf8");
    expect(src).toMatch(/error:\s*"redis\.failed"/);
    expect(src).not.toMatch(/error:\s*err\.message/);
  });
});
