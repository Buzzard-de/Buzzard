import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("categoryReadiness", () => {
  it("runs checks for category", async () => {
    const categoryReadiness = require("../lib/categoryReadiness.js");
    const result = await categoryReadiness.runChecksForCategory("Automotive");
    expect(result.checks.products).toBeDefined();
    expect(result.checks.pricing).toBeDefined();
    expect(result.overall).toBeDefined();
    expect(result.salesEnabled).toBe(false);
  });

  it("computeOverallFromChecks", () => {
    const { computeOverallFromChecks } = require("../lib/categoryReadiness.js");
    const { CHECK_STATUS } = require("../core/jobConstants.js");
    expect(computeOverallFromChecks({
      products: CHECK_STATUS.PASS,
      pricing: CHECK_STATUS.PASS,
    })).toBe("READY");
    expect(computeOverallFromChecks({
      products: CHECK_STATUS.FAIL,
    })).toBe("NOT_READY");
  });
});

describe("integrationHealth", () => {
  it("runs all health checks", async () => {
    const integrationHealth = require("../lib/integrationHealth.js");
    const rows = await integrationHealth.runAllHealthChecks();
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("aiJobBridge", () => {
  it("blocks wildcard AI permissions", () => {
    const { validateAiPermissions } = require("../lib/aiJobBridge.js");
    expect(validateAiPermissions(["*"]).ok).toBe(false);
    expect(validateAiPermissions(["ai.read"]).ok).toBe(true);
  });
});

describe("redisClient", () => {
  it("reports not configured without env", () => {
    const redisClient = require("../lib/redisClient.js");
    expect(redisClient.isConfigured()).toBe(false);
  });
});

describe("jobHandlers", () => {
  it("has all Part 5 job types", () => {
    const { HANDLERS } = require("../lib/jobHandlers.js");
    const { JOB_TYPES } = require("../core/jobConstants.js");
    for (const t of Object.values(JOB_TYPES)) {
      expect(HANDLERS[t]).toBeTypeOf("function");
    }
  });
});
