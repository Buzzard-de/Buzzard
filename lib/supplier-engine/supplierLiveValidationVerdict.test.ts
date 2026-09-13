import { describe, it, expect } from "vitest";
import { computeLiveValidationVerdict } from "./liveValidationVerdict";
import type { LiveOnboardingReport } from "./liveOnboarding";

function baseReport(overrides: Partial<LiveOnboardingReport> = {}): LiveOnboardingReport {
  return {
    source: "SKIPPED",
    supplier: { id: "SUP-INTER-CARS-001", name: "Inter Cars", country: "DE", type: "B2B" },
    connector: "b2b-sandbox",
    environment: "SANDBOX",
    documentation: [],
    authentication: "oauth2",
    endpoints: {},
    networkGuards: { networkEnabled: false, liveReadEnabled: false, orderNetworkEnabled: false },
    connection: { status: "SKIPPED", message: "skipped" },
    dryRun: { status: "SKIPPED", message: "skipped" },
    liveRead: { status: "SKIPPED", message: "skipped" },
    products: { total: 0, valid: 0, invalid: 0, duplicates: 0, offers: 0, stockRecords: 0, priceRecords: 0 },
    productSamples: [],
    cursor: { restartContinues: "UNKNOWN" },
    timing: {},
    security: { orderNetworkDisabled: true, secretsInRepo: false, customerPiiUsed: false },
    completedAt: new Date().toISOString(),
    limitations: ["Live credentials not resolved"],
    acceptance: {
      connection: "SKIPPED",
      testSync: "SKIPPED",
      liveRead: "SKIPPED",
      productEngine: "SKIPPED",
      inventoryEngine: "SKIPPED",
      pricingEngine: "SKIPPED",
      admin: "SKIPPED",
      security: "PASS",
      persistentCursor: "SKIPPED",
      restartIdempotency: "SKIPPED",
      retryBehavior: "SKIPPED",
      orderNetwork: "DISABLED",
      returnRefundNetwork: "DISABLED",
    },
    liveValidation: {
      verdict: "LIVE NOT VALIDATED / SKIPPED",
      message: "",
      connection: "SKIPPED",
      testSync: "SKIPPED",
      liveRead: "SKIPPED",
      realB2bSupplierOnboardingValidated: false,
      deploymentCredentialBlocker: true,
    },
    ...overrides,
  };
}

describe("Live validation verdict", () => {
  it("reports SKIPPED when credentials missing", () => {
    const verdict = computeLiveValidationVerdict(baseReport(), { credentialsPresent: false });
    expect(verdict.verdict).toBe("LIVE NOT VALIDATED / SKIPPED");
    expect(verdict.message).toContain("REAL INTER CARS CREDENTIALS REQUIRED");
    expect(verdict.realB2bSupplierOnboardingValidated).toBe(false);
  });

  it("reports LIVE VALIDATED only when all live phases pass", () => {
    const verdict = computeLiveValidationVerdict(
      baseReport({
        source: "LIVE",
        connection: {
          status: "CONNECTED",
          latencyMs: 120,
          connector: "b2b-sandbox",
          environment: "SANDBOX",
          message: "ok",
          checkedAt: new Date().toISOString(),
        },
        dryRun: {
          ok: true,
          dryRun: true,
          supplierId: "SUP-INTER-CARS-001",
          productsFound: 10,
          valid: 10,
          invalid: 0,
          duplicates: 0,
          stockRecords: 10,
          priceRecords: 10,
          warnings: [],
          errors: [],
          source: "live",
          completedAt: new Date().toISOString(),
        },
        liveRead: [{ batchSize: 10, source: "LIVE", status: "COMPLETED", jobId: "j1", supplierId: "SUP-INTER-CARS-001", jobType: "INCREMENTAL", productsFetched: 10, productsCreated: 0, productsUpdated: 0, productsFailed: 0, stockUpdates: 10, priceUpdates: 10, errors: [], startedAt: "", completedAt: "" }],
        limitations: [],
      }),
      { credentialsPresent: true }
    );
    expect(verdict.verdict).toBe("LIVE VALIDATED");
    expect(verdict.realB2bSupplierOnboardingValidated).toBe(true);
  });

  it("never treats mock source as LIVE VALIDATED", () => {
    const verdict = computeLiveValidationVerdict(
      baseReport({
        dryRun: {
          ok: true,
          dryRun: true,
          supplierId: "SUP-INTER-CARS-001",
          productsFound: 5,
          valid: 5,
          invalid: 0,
          duplicates: 0,
          stockRecords: 0,
          priceRecords: 0,
          warnings: [],
          errors: [],
          source: "mock",
          completedAt: new Date().toISOString(),
        },
        connection: {
          status: "CONNECTED",
          latencyMs: 50,
          connector: "b2b-sandbox",
          environment: "SANDBOX",
          message: "ok",
          checkedAt: new Date().toISOString(),
        },
        limitations: [],
      }),
      { credentialsPresent: true }
    );
    expect(verdict.verdict).not.toBe("LIVE VALIDATED");
  });
});
