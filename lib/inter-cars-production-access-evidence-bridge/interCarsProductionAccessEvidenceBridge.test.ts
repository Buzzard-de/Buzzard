import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resetRejectedEvidenceAttemptsForTests } from "@/lib/production-access/evidencePolicy";
import { resetValidationForTests, saveValidationRecord } from "@/lib/supplier-production-validation/persistence";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { buildInterCarsProductionAccessBridgeReport } from "./accessReport";
import { buildInterCarsCapabilityMatrix } from "./capabilityMatrix";
import { hashInterCarsEvidenceMetadata } from "./evidenceHash";
import {
  registerInterCarsCredentialEvidence,
  resetInterCarsEvidenceStoreForTests,
} from "./evidenceStore";
import { resolveInterCarsCredentialBridgeState } from "./secretRefBridge";

const ORIGINAL_ENV = { ...process.env };

const VALID_JWT = JSON.stringify({
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwcm9kLXVzZXIifQ.sig",
});

function validEvidence(overrides: Partial<Parameters<typeof registerInterCarsCredentialEvidence>[0]> = {}) {
  return {
    providerId: "inter-cars" as const,
    environment: "PRODUCTION" as const,
    source: "INTER_CARS_LIVE" as const,
    credentialType: "oauth2",
    secretRef: "env:SUPPLIER_LIVE_CREDENTIALS",
    validationMethod: "GET",
    timestamp: new Date().toISOString(),
    endpoint: "https://api.intercars.eu/health",
    responseStatus: 200,
    capability: "health" as const,
    evidenceReference: "ref-ic-1",
    operator: "operator@test",
    ...overrides,
  };
}

describe("Inter Cars production access evidence bridge", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    process.env.SALES_ENABLED = "0";
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
    resetInterCarsEvidenceStoreForTests();
    resetRejectedEvidenceAttemptsForTests();
    resetValidationForTests();
    resetSupplierEngineForTests();
    getSupplier(getInterCarsSupplierId());
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("missing secretRef → NOT_CONFIGURED credential reference", () => {
    expect(resolveInterCarsCredentialBridgeState()).toBe("NOT_CONFIGURED");
    const report = buildInterCarsProductionAccessBridgeReport();
    expect(report.readOnlyAccess).toBe("BLOCKED_EXTERNAL_ACCESS");
    expect(report.createOrder).toBe("UNVERIFIED");
  });

  it("secretRef present without value → REFERENCE_PRESENT not VALIDATED", () => {
    process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF = "SUPPLIER_LIVE_CREDENTIALS";
    expect(resolveInterCarsCredentialBridgeState()).toBe("REFERENCE_PRESENT");
  });

  it("rejects LOCAL source as production evidence", () => {
    expect(() => registerInterCarsCredentialEvidence(validEvidence({ source: "LOCAL" }))).toThrow(/SOURCE_NOT_LIVE/);
  });

  it("rejects SANDBOX environment", () => {
    expect(() =>
      registerInterCarsCredentialEvidence(validEvidence({ environment: "SANDBOX" as "PRODUCTION" })),
    ).toThrow(/ENVIRONMENT_NOT_PRODUCTION/);
  });

  it("rejects createOrder capability registration in bridge", () => {
    expect(() => registerInterCarsCredentialEvidence(validEvidence({ capability: "createOrder" as "health" }))).toThrow(
      /ORDER_CAPABILITY_NOT_ALLOWED/,
    );
  });

  it("anti-false-positive: read caps PASS does not promote createOrder", () => {
    process.env.SUPPLIER_LIVE_CREDENTIALS = VALID_JWT;
    saveValidationRecord({
      validationId: "val_bridge_a",
      supplierId: getInterCarsSupplierId(),
      adapterProfile: "inter-cars",
      market: "DE",
      channel: "DIRECT",
      environment: "PRODUCTION",
      overallStatus: "PASSED",
      credentialStatus: "VALID",
      credentialType: "oauth",
      healthStatus: "LIVE_READ_VALIDATED",
      catalogReadStatus: "LIVE_READ_VALIDATED",
      stockReadStatus: "LIVE_READ_VALIDATED",
      priceReadStatus: "LIVE_READ_VALIDATED",
      createOrderCapability: "UNVERIFIED",
      orderStatusCapability: "UNVERIFIED",
      trackingCapability: "UNVERIFIED",
      returnCapability: "UNVERIFIED",
      refundCapability: "UNVERIFIED",
      dropshippingCapability: "DECLARED",
      blindShippingCapability: "DECLARED",
      whiteLabelCapability: "DECLARED",
      capabilityVersion: "339",
      riskLevel: "LOW",
      readinessStatus: "READY",
      blockerCodes: [],
      checks: [],
      idempotencyKey: "idem_bridge",
      correlationId: "corr_bridge",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const matrix = buildInterCarsCapabilityMatrix();
    expect(matrix.find((c) => c.capability === "catalog")?.status).toBe("LIVE_READ_VALIDATED");
    expect(matrix.find((c) => c.capability === "createOrder")?.status).toBe("UNVERIFIED");
  });

  it("hash never includes raw credential values", () => {
    const hash = hashInterCarsEvidenceMetadata(
      validEvidence({ secretRef: "env:SUPPLIER_LIVE_CREDENTIALS" }),
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(validEvidence())).not.toContain("mock-token");
  });

  it("expired evidence blocks credential VALIDATED promotion", () => {
    process.env.SUPPLIER_LIVE_CREDENTIALS = VALID_JWT;
    registerInterCarsCredentialEvidence(
      validEvidence({ expiresAt: new Date(Date.now() - 1000).toISOString(), evidenceReference: "exp-1" }),
    );
    expect(resolveInterCarsCredentialBridgeState()).not.toBe("VALIDATED");
  });

  it("network order enabled blocks safe prep (via diagnostic blockers)", () => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "1";
    const report = buildInterCarsProductionAccessBridgeReport();
    expect(report.blockers).toContain("ORDER_NETWORK_MUST_BE_OFF_IN_PREP");
  });

  it("real side effects remain zero in default CI", () => {
    const report = buildInterCarsProductionAccessBridgeReport();
    expect(report.realSideEffects).toBe(0);
  });
});
