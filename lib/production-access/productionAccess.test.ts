import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildMissingProductionAccessReport,
  resolveInterCarsSecretRef,
  buildInterCarsAccessChecklist,
  getAllProviderStates,
  recordProviderAccessEvidence,
  resetEvidenceStoreForTests,
  validateProviderCredentialPipeline,
  validateAllProviderCredentialPipelines,
  deriveProviderLiveStatus,
} from "./index";
import { resolveGenericSecretRef } from "./secretRefs";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";

const ORIGINAL = { ...process.env };

describe("Missing production access diagnostics", () => {
  beforeEach(() => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.SALES_ENABLED = "0";
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
    resetEvidenceStoreForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("Inter Cars secret NOT_CONFIGURED without credentials", () => {
    const secret = resolveInterCarsSecretRef();
    expect(secret.secretResolvable).toBe(false);
    expect(secret.credentialStatus).toBe("NOT_CONFIGURED");
  });

  it("blocks mock credentials", () => {
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    resetSupplierEngineForTests();
    getSupplier(getInterCarsSupplierId());
    process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ accessToken: "mock-token" });
    const secret = resolveInterCarsSecretRef();
    expect(secret.secretResolvable).toBe(true);
    expect(secret.credentialStatus).toBe("BLOCKED");
  });

  it("access checklist never marks #342 VALIDATED without evidence", () => {
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    const checklist = buildInterCarsAccessChecklist(resolveInterCarsSecretRef());
    const cv = checklist.find((c) => c.id === "ic_controlled_validation");
    expect(cv?.status).toBe("UNVERIFIED");
  });

  it("missing access report sales CLOSED and zero side effects", () => {
    const report = buildMissingProductionAccessReport();
    expect(report.sales).toBe("CLOSED");
    expect(report.realSideEffects.realSupplierOrders).toBe(0);
    expect(report.interCars.liveValidation).not.toBe("VALIDATED");
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it("never enables production flags in report", () => {
    const report = buildMissingProductionAccessReport();
    expect(report.productionFlags.SALES).toBe("OFF");
    expect(report.productionFlags.SUPPLIER_ORDER_NETWORK).toBe("OFF");
  });

  it("provider registry tracks all six providers", () => {
    const states = getAllProviderStates();
    expect(states).toHaveLength(6);
    expect(states.map((s) => s.providerId).sort()).toEqual(
      ["ai", "carrier", "inter-cars", "marketing", "payment", "returns"].sort(),
    );
  });

  it("rejects MOCK/SANDBOX evidence", () => {
    expect(() =>
      recordProviderAccessEvidence({
        provider: "inter-cars",
        capability: "health",
        endpoint: "/health",
        requestPayload: {},
        responseStatus: 200,
        environment: "MOCK",
      }),
    ).toThrow("FAKE_EVIDENCE_REJECTED");
  });

  it("accepts PRODUCTION evidence metadata only", () => {
    const evidence = recordProviderAccessEvidence({
      provider: "inter-cars",
      capability: "health",
      endpoint: "/health",
      requestPayload: { probe: true },
      responseStatus: 200,
      environment: "PRODUCTION",
      operator: "ops@test.com",
    });
    expect(evidence.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.environment).toBe("PRODUCTION");
  });

  it("returns provider detects secretRef when configured", () => {
    process.env.RETURNS_PROVIDER_SECRET_REF = "RETURNS_LIVE_CREDENTIALS";
    process.env.RETURNS_LIVE_CREDENTIALS = JSON.stringify({ apiKey: "live-returns-key" });
    const states = getAllProviderStates();
    const returns = states.find((s) => s.providerId === "returns");
    expect(returns?.secretRefConfigured).toBe(true);
    expect(returns?.credentialConfigured).toBe(true);
    delete process.env.RETURNS_PROVIDER_SECRET_REF;
    delete process.env.RETURNS_LIVE_CREDENTIALS;
  });

  it("payment provider detects per-provider secretRef", () => {
    process.env.PAYPAL_CLIENT_ID_SECRET_REF = "PAYPAL_LIVE_ID";
    process.env.PAYPAL_LIVE_ID = "live-paypal-client-id";
    const states = getAllProviderStates();
    const payment = states.find((s) => s.providerId === "payment");
    expect(payment?.secretRefConfigured).toBe(true);
    delete process.env.PAYPAL_CLIENT_ID_SECRET_REF;
    delete process.env.PAYPAL_LIVE_ID;
  });

  it("credential validation pipeline reports NOT_CONFIGURED without credentials", () => {
    const result = validateProviderCredentialPipeline("carrier");
    expect(result.overallStatus).toBe("NOT_CONFIGURED");
    expect(result.liveValidationAttempted).toBe(false);
    expect(result.blockers).toContain("PROVIDER_NOT_CONFIGURED");
  });

  it("validateAllProviderCredentialPipelines covers six providers", () => {
    const results = validateAllProviderCredentialPipelines();
    expect(results).toHaveLength(6);
    expect(results.every((r) => r.liveValidationAttempted === false)).toBe(true);
  });

  it("deriveProviderLiveStatus never VALIDATED without evidence", () => {
    process.env.CARRIER_PROVIDER_SECRET_REF = "CARRIER_LIVE";
    process.env.CARRIER_LIVE = JSON.stringify({ apiKey: "carrier-live" });
    const secret = resolveGenericSecretRef({
      providerId: "carrier",
      secretRefEnvKey: "CARRIER_PROVIDER_SECRET_REF",
    });
    expect(deriveProviderLiveStatus({ secret, evidenceCapabilities: ["health"] })).toBe("UNVERIFIED");
    delete process.env.CARRIER_PROVIDER_SECRET_REF;
    delete process.env.CARRIER_LIVE;
  });
});
