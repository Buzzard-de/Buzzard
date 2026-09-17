import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runFulfillmentPreflight,
  startFulfillmentPipeline,
  executeFulfillmentPipelineDryRun,
  markFulfillmentUnknownOutcome,
  getFulfillmentPipelineDashboard,
  assertFulfillmentSafetyInvariants,
  resetFulfillmentSafetyCountersForTests,
  resetFulfillmentPipelineForTests,
} from "./index";
import { saveFulfillmentPipelineRecord } from "./persistence";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";
import { getSupplier } from "@/lib/supplier-engine/registry";
import {
  evaluateSupplierOrderReadiness,
  saveReadinessRecord,
  resetReadinessForTests,
  resetKillSwitchForTests,
} from "@/lib/supplier-order-readiness";
import { saveValidationRecord as save339, resetValidationForTests as reset339 } from "@/lib/supplier-production-validation/persistence";
import { saveValidationRecord as save341, saveControlledValidationRun, resetValidationForTests as reset341 } from "@/lib/supplier-production-order-validation/persistence";
import { saveActivationRecord, resetActivationForTests } from "@/lib/supplier-order-activation/persistence";
import { saveRehearsalRecord, resetRehearsalForTests } from "@/lib/supplier-order-rehearsal/persistence";
import {
  requestProductionOrderArming,
  approveProductionOrderArming,
  armProductionOrder,
  resetArmingForTests,
} from "@/lib/supplier-production-order-arming";
import { promoteCreateOrderCapabilityValidated } from "@/lib/supplier-production-order-validation/capabilityUpdate";

const ORIGINAL_ENV = { ...process.env };

const scope = {
  supplierId: "SUP-INTER-CARS-001",
  market: "DE",
  channel: "DIRECT" as const,
  environment: "PRODUCTION" as const,
  currency: "EUR",
};

function seedEnv() {
  process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
  process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
  process.env.SUPPLIER_NETWORK_ENABLED = "0";
  process.env.PAYMENT_PRODUCTION_ENABLED = "0";
  process.env.SALES_ENABLED = "0";
  process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE = "0";
  process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION_PERSISTENCE = "0";
  process.env.BUZZARD_SUPPLIER_ORDER_REHEARSAL_PERSISTENCE = "0";
  process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE = "0";
  process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION_PERSISTENCE = "0";
  process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING_PERSISTENCE = "0";
}

function seedUpstream() {
  const supplierId = getInterCarsSupplierId();
  getSupplier(supplierId);
  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market: "DE", channel: "DIRECT", environment: "PRODUCTION" },
    { force: true, correlationId: "seed348" },
  );
  readiness.overallStatus = "READY";
  readiness.blockers = [];
  saveReadinessRecord(readiness);

  save339({
    validationId: `pval348_${Date.now()}`,
    supplierId,
    adapterProfile: "inter-cars",
    environment: "PRODUCTION",
    market: "DE",
    channel: "DIRECT",
    credentialStatus: "CONFIGURED",
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
    correlationId: "seed348",
    idempotencyKey: `pval348_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveRehearsalRecord({
    rehearsalId: `reh348_${Date.now()}`,
    orderId: "ORD-SEED348",
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    currentStage: "REHEARSAL_RESULT",
    overallStatus: "PASSED",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    correlationId: "seed348",
    idempotencyKey: `reh348_idem_${Date.now()}`,
    stages: [],
    supplierOrderClassification: "SANDBOX",
    simulatedResponse: true,
    realActivationBlocked: true,
    auditEventCount: 1,
  });

  saveActivationRecord({
    activationId: `act348_${Date.now()}`,
    supplierId,
    adapterProfile: "inter-cars",
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    status: "APPROVED",
    networkState: "DISABLED",
    realOrderSent: false,
    requestedBy: "ops@example.com",
    approvedBy: "manager@example.com",
    riskLevel: "LOW",
    correlationId: "seed348",
    idempotencyKey: `act348_idem_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const validationId = `cvr348_evidence_${Date.now()}`;
  const capabilityState = promoteCreateOrderCapabilityValidated(true);

  save341({
    validationId,
    supplierId,
    adapterProfile: "inter-cars",
    environment: "PRODUCTION",
    market: "DE",
    channel: "DIRECT",
    orderId: "ORD-VALIDATED-348",
    createOrderCapability: "VALIDATED",
    capabilityState,
    trackingCapability: "UNVERIFIED",
    validationMode: "CONTROLLED_VALIDATION",
    requestPayloadHash: "abc348hash",
    supplierOrderId: "IC-EVIDENCE-348",
    unknownOutcome: false,
    humanReviewRequired: false,
    blockerCodes: [],
    correlationId: "seed348",
    idempotencyKey: `cvr348_idem_${Date.now()}`,
    overallStatus: "PASSED",
    checks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    controlledValidation: true,
    liveValidation: "PASS",
  });

  saveControlledValidationRun({
    validationId,
    supplier: supplierId,
    orderReference: "ORD-VALIDATED-348",
    orderId: "ORD-VALIDATED-348",
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    allowedProduct: "test-sku",
    allowedMarket: "DE",
    payloadHash: "abc348hash",
    approvalStatus: "APPROVED",
    preflightPassed: true,
    liveValidation: "PASS",
    createOrderCapability: "VALIDATED",
    capabilityState,
    supplierOrderReference: "IC-EVIDENCE-348",
    unknownOutcome: false,
    humanReviewRequired: false,
    httpCallsMade: 1,
    blockerCodes: [],
    checks: [],
    idempotencyKey: `cvr348_run_${Date.now()}`,
    correlationId: "seed348",
    validationMode: "CONTROLLED_VALIDATION",
    overallStatus: "PASSED",
    approvedBy: "manager@example.com",
    requester: "ops@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const arming = requestProductionOrderArming({
    requester: "ops@example.com",
    idempotencyKey: `arm348_${Date.now()}`,
  });
  approveProductionOrderArming({
    armingId: arming.armingId,
    approverId: "manager@example.com",
    requesterId: "ops@example.com",
    scope: arming.scope,
    limits: arming.limits,
  });
  armProductionOrder({ armingId: arming.armingId, actorId: "manager@example.com" });
}

describe("#348 First order fulfillment pipeline", () => {
  beforeEach(() => {
    seedEnv();
    resetSupplierEngineForTests();
    resetReadinessForTests();
    resetKillSwitchForTests();
    reset339();
    reset341();
    resetRehearsalForTests();
    resetActivationForTests();
    resetArmingForTests();
    resetFulfillmentSafetyCountersForTests();
    resetFulfillmentPipelineForTests();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("preflight includes createOrder blocked in prep", () => {
    const preflight = runFulfillmentPreflight({
      orderId: "ord_test_1",
      scope,
      requester: "admin@test",
      orderValue: 100,
      quantity: 1,
      currency: "EUR",
      items: [{ sku: "SKU-1", quantity: 1, unitPrice: 100 }],
    });
    expect(preflight.checks.some((c) => c.stage === "SUPPLIER_CREATE_ORDER" && c.status === "BLOCKED")).toBe(true);
  });

  it("dry-run pipeline completes without real supplier reference", () => {
    seedUpstream();
    const record = startFulfillmentPipeline({
      orderId: "ord_test_2",
      scope,
      requester: "admin@test",
      orderValue: 100,
      quantity: 1,
      currency: "EUR",
      items: [{ sku: "SKU-1", quantity: 1, unitPrice: 100 }],
    });
    const executed = executeFulfillmentPipelineDryRun(record.pipelineId);
    expect(executed.state).toBe("COMPLETED");
    expect(executed.dryRun).toBe(true);
    expect(executed.supplierOrderReference).toBeUndefined();
  });

  it("unknown outcome recorded without auto-retry", () => {
    saveFulfillmentPipelineRecord({
      pipelineId: "pipe-unknown-1",
      orderId: "ord_u1",
      state: "IN_PROGRESS",
      currentStage: "SUPPLIER_CREATE_ORDER",
      scope,
      limits: {
        maximumOrderValue: 500,
        maximumQuantity: 5,
        allowedSupplier: scope.supplierId,
        allowedMarket: scope.market,
        singleOrderOnly: true,
      },
      idempotencyKey: "fof348_test",
      nonce: "nonce348_test",
      nonceUsed: false,
      unknownOutcome: false,
      dryRun: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    const unknown = markFulfillmentUnknownOutcome("pipe-unknown-1");
    expect(unknown.state).toBe("UNKNOWN_OUTCOME");
  });

  it("dashboard reports UNVERIFIED live and DISABLED production", () => {
    const dash = getFulfillmentPipelineDashboard();
    expect(dash.liveStatus).toBe("UNVERIFIED");
    expect(dash.productionEnabled).toBe("DISABLED");
    expect(dash.supplierOrderNetwork).toBe("OFF");
  });

  it("safety invariants zero real side effects", () => {
    expect(assertFulfillmentSafetyInvariants().ok).toBe(true);
  });
});
