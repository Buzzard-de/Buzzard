import { randomUUID } from "crypto";
import { listMarkets } from "@/lib/market-engine/registry";
import { getSupplier, isSupplierSelectable } from "@/lib/supplier-engine/registry";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import { evaluateSupplierOrderReadiness } from "@/lib/supplier-order-readiness/evaluator";
import { VALIDATION_CHANNELS, VALIDATOR_VERSION, buildValidationIdempotencyKey, credentialRefFingerprint, getInterCarsAdapterProfile, getInterCarsSupplierId } from "./config";
import { validateProductionCredentials } from "./credentialValidation";
import { validateDeclaredCapabilities } from "./capabilityValidation";
import { runReadOnlyLiveValidation } from "./liveReadValidation";
import {
  blockOrderEndpointAttempt,
  classifyEndpoint,
  extractProfileAllowedHosts,
  guardHttpMethod,
  validateEndpointUrl,
} from "./endpointSecurity";
import { recordValidationAudit } from "./audit";
import { resolveFailureInjection, applyFailureInjection } from "./failureInjection";
import {
  saveValidationRecord,
  getValidationByIdempotency,
  getInflightValidation,
  setInflightValidation,
  clearInflightValidation,
} from "./persistence";
import {
  assertProductionValidationNetworkSafety,
  assertProductionValidationSafetyInvariants,
} from "./safety";
import type {
  ProductionValidationInput,
  SupplierProductionCapabilityValidation,
  ValidationCheckResult,
  ValidationOverallStatus,
  ValidationScope,
} from "./types";

function deriveOverallStatus(blockerCodes: string[], checks: ValidationCheckResult[]): ValidationOverallStatus {
  if (checks.some((c) => c.status === "FAIL")) return "FAILED";
  if (blockerCodes.length > 0 || checks.some((c) => c.status === "BLOCKED")) return "BLOCKED";
  if (checks.every((c) => c.status === "SKIPPED")) return "SKIPPED";
  return "PASSED";
}

function deriveRiskLevel(blockerCodes: string[]): "LOW" | "MEDIUM" | "HIGH" | "BLOCKED" {
  if (blockerCodes.some((b) => b.includes("SECURITY") || b.includes("CREDENTIAL_MOCK"))) return "BLOCKED";
  if (blockerCodes.length > 0) return "HIGH";
  return "LOW";
}

export async function runProductionCapabilityValidation(
  input: ProductionValidationInput
): Promise<SupplierProductionCapabilityValidation> {
  assertProductionValidationNetworkSafety();

  const profile = resolvePredefinedLiveProfile();
  const supplierId = input.supplierId || profile?.supplierId || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const environment = input.environment || (profile?.environment === "PRODUCTION" ? "PRODUCTION" : "SANDBOX");
  const correlationId = input.correlationId || randomUUID();
  const secretsRef = profile?.secretsRef;
  const idempotencyKey =
    input.idempotencyKey ||
    buildValidationIdempotencyKey({
      supplierId,
      market,
      channel,
      environment,
      credentialRefFingerprint: credentialRefFingerprint(secretsRef),
    });

  const existing = getValidationByIdempotency(idempotencyKey);
  if (existing && ["PASSED", "BLOCKED", "FAILED", "SKIPPED"].includes(existing.overallStatus)) {
    return existing;
  }

  const inflight = getInflightValidation(idempotencyKey);
  if (inflight) return inflight;

  const promise = executeValidation(input, {
    supplierId,
    market,
    channel,
    environment,
    correlationId,
    idempotencyKey,
  });
  setInflightValidation(idempotencyKey, promise);
  try {
    return await promise;
  } finally {
    clearInflightValidation(idempotencyKey);
  }
}

async function executeValidation(
  input: ProductionValidationInput,
  scope: ValidationScope & { correlationId: string; idempotencyKey: string }
): Promise<SupplierProductionCapabilityValidation> {
  const now = new Date().toISOString();
  const checks: ValidationCheckResult[] = [];
  const blockerCodes: string[] = [];
  const injection = resolveFailureInjection(input.failureInjection || "NONE");

  const record: SupplierProductionCapabilityValidation = {
    validationId: `pval_${randomUUID().slice(0, 12)}`,
    supplierId: scope.supplierId,
    adapterProfile: getInterCarsAdapterProfile(),
    environment: scope.environment,
    market: scope.market,
    channel: scope.channel,
    credentialStatus: "NOT_CONFIGURED",
    credentialType: "unknown",
    healthStatus: "SKIPPED",
    catalogReadStatus: "SKIPPED",
    stockReadStatus: "SKIPPED",
    priceReadStatus: "SKIPPED",
    createOrderCapability: "UNVERIFIED",
    orderStatusCapability: "UNVERIFIED",
    trackingCapability: "UNVERIFIED",
    returnCapability: "UNVERIFIED",
    refundCapability: "UNVERIFIED",
    dropshippingCapability: "NOT_CONFIGURED",
    blindShippingCapability: "NOT_CONFIGURED",
    whiteLabelCapability: "NOT_CONFIGURED",
    capabilityVersion: VALIDATOR_VERSION,
    riskLevel: "LOW",
    readinessStatus: "UNKNOWN",
    blockerCodes: [],
    correlationId: scope.correlationId,
    idempotencyKey: scope.idempotencyKey,
    overallStatus: "RUNNING",
    checks: [],
    createdAt: now,
    updatedAt: now,
    failureInjection: input.failureInjection,
  };

  recordValidationAudit({
    type: "PRODUCTION_VALIDATION_CREATED",
    validationId: record.validationId,
    supplierId: scope.supplierId,
    correlationId: scope.correlationId,
  });
  saveValidationRecord(record);

  if (injection) {
    record.checks = applyFailureInjection(checks, injection);
    if (injection.blockerCode) blockerCodes.push(injection.blockerCode);
    record.blockerCodes = blockerCodes;
    record.overallStatus = deriveOverallStatus(blockerCodes, record.checks);
    record.updatedAt = new Date().toISOString();
    recordValidationAudit({
      type: "VALIDATION_BLOCKED",
      validationId: record.validationId,
      supplierId: scope.supplierId,
      correlationId: scope.correlationId,
      detail: { injection: input.failureInjection },
    });
    saveValidationRecord(record);
    return finalize(record);
  }

  const supplier = getSupplier(scope.supplierId);
  if (!supplier) {
    checks.push({ check: "SUPPLIER_IDENTITY", status: "BLOCKED", message: "Supplier not found" });
    blockerCodes.push("SUPPLIER_NOT_FOUND");
  } else if (!isSupplierSelectable(scope.supplierId)) {
    checks.push({ check: "SUPPLIER_IDENTITY", status: "BLOCKED", message: "Supplier disabled" });
    blockerCodes.push("SUPPLIER_DISABLED");
  } else {
    checks.push({ check: "SUPPLIER_IDENTITY", status: "PASS", message: "Supplier enabled" });
  }

  if (!supplier?.supportedMarkets?.includes(scope.market)) {
    checks.push({ check: "MARKET_ELIGIBILITY", status: "BLOCKED", message: `Market ${scope.market} not supported` });
    blockerCodes.push("MARKET_UNSUPPORTED");
  } else if (listMarkets().length !== 35) {
    checks.push({ check: "MARKET_SSOT", status: "WARNING", message: `Market registry count ${listMarkets().length}` });
  } else {
    checks.push({ check: "MARKET_ELIGIBILITY", status: "PASS", message: "Market eligible (35-market SSOT)" });
  }

  if (!VALIDATION_CHANNELS.includes(scope.channel)) {
    checks.push({ check: "CHANNEL_ELIGIBILITY", status: "BLOCKED", message: `Channel ${scope.channel} unsupported` });
    blockerCodes.push("CHANNEL_UNSUPPORTED");
  } else {
    checks.push({ check: "CHANNEL_ELIGIBILITY", status: "PASS", message: "Channel supported" });
  }

  if (isActivationKillSwitched(scope)) {
    checks.push({ check: "KILL_SWITCH", status: "BLOCKED", message: "Kill switch active" });
    blockerCodes.push("KILL_SWITCH");
  } else {
    checks.push({ check: "KILL_SWITCH", status: "PASS", message: "Kill switch off" });
  }

  const credential = validateProductionCredentials({
    supplierId: scope.supplierId,
    environment: scope.environment,
  });
  record.credentialStatus = credential.status;
  record.credentialType = credential.credentialType;
  checks.push(...credential.checks);
  blockerCodes.push(...credential.blockerCodes);
  recordValidationAudit({
    type: "CREDENTIAL_CHECKED",
    validationId: record.validationId,
    supplierId: scope.supplierId,
    correlationId: scope.correlationId,
    detail: { status: credential.status, authType: credential.credentialType },
  });

  const profile = resolvePredefinedLiveProfile();
  if (profile?.baseUrl) {
    const allowedHosts = extractProfileAllowedHosts(profile.baseUrl, profile.allowedEndpoints || []);
    const endpointCheck = validateEndpointUrl(
      profile.baseUrl,
      allowedHosts,
      scope.environment === "PRODUCTION"
    );
    checks.push({
      check: "ENDPOINT_VALIDATION",
      status: endpointCheck.allowed ? "PASS" : "BLOCKED",
      message: endpointCheck.reason || "Endpoint validated",
      detail: { hostname: endpointCheck.hostname },
    });
    if (!endpointCheck.allowed) blockerCodes.push("ENDPOINT_BLOCKED");
    recordValidationAudit({
      type: "ENDPOINT_CHECKED",
      validationId: record.validationId,
      supplierId: scope.supplierId,
      correlationId: scope.correlationId,
    });

    for (const [name, path] of Object.entries(profile.endpoints || {})) {
      const classification = classifyEndpoint(String(path));
      if (classification === "UNKNOWN") {
        checks.push({ check: "ENDPOINT_CLASSIFICATION", status: "BLOCKED", message: `Unknown endpoint ${name}` });
        blockerCodes.push("UNKNOWN_ENDPOINT");
      }
    }

    const orderPath = "/ic/order/createOrder";
    const methodGuard = guardHttpMethod("POST", orderPath, {
      correlationId: scope.correlationId,
      validationId: record.validationId,
      supplierId: scope.supplierId,
    });
    checks.push({
      check: "HTTP_METHOD_GUARD",
      status: methodGuard.allowed ? "PASS" : "BLOCKED",
      message: methodGuard.reason || "Write methods blocked on order endpoints",
    });
    blockOrderEndpointAttempt(new URL(orderPath, profile.baseUrl).toString(), {
      correlationId: scope.correlationId,
      validationId: record.validationId,
      supplierId: scope.supplierId,
    });
    recordValidationAudit({ type: "ORDER_CAPABILITY_CHECKED", validationId: record.validationId, correlationId: scope.correlationId });
  }

  const capabilities = validateDeclaredCapabilities(scope.supplierId);
  record.createOrderCapability = capabilities.createOrderCapability;
  record.orderStatusCapability = capabilities.orderStatusCapability;
  record.trackingCapability = capabilities.trackingCapability;
  record.returnCapability = capabilities.returnCapability;
  record.refundCapability = capabilities.refundCapability;
  record.dropshippingCapability = capabilities.dropshippingCapability;
  record.blindShippingCapability = capabilities.blindShippingCapability;
  record.whiteLabelCapability = capabilities.whiteLabelCapability;
  checks.push(...capabilities.checks);
  blockerCodes.push(...capabilities.blockerCodes);

  if (credential.status === "VALID" && input.allowLiveRead) {
    const live = await runReadOnlyLiveValidation({
      supplierId: scope.supplierId,
      allowLiveRead: true,
    });
    record.healthStatus = live.healthStatus;
    record.catalogReadStatus = live.catalogReadStatus;
    record.stockReadStatus = live.stockReadStatus;
    record.priceReadStatus = live.priceReadStatus;
    record.liveReadTimestamp = live.liveReadTimestamp;
    checks.push(...live.checks);
    if (!live.skipped && live.checks.some((c) => c.status === "FAIL")) {
      blockerCodes.push("LIVE_READ_FAILED");
    }
    for (const type of ["HEALTH_CHECKED", "CATALOG_CHECKED", "STOCK_CHECKED", "PRICE_CHECKED"] as const) {
      recordValidationAudit({ type, validationId: record.validationId, correlationId: scope.correlationId });
    }
  } else {
    const skipReason =
      credential.status !== "VALID" ? "Credential not VALID" : "Live read not enabled or not requested";
    checks.push({ check: "LIVE_READ", status: "SKIPPED", message: skipReason });
    record.healthStatus = "SKIPPED";
    record.catalogReadStatus = "SKIPPED";
    record.stockReadStatus = "SKIPPED";
    record.priceReadStatus = "SKIPPED";
  }

  recordValidationAudit({
    type: "TRACKING_CAPABILITY_CHECKED",
    validationId: record.validationId,
    correlationId: scope.correlationId,
    detail: { status: record.trackingCapability },
  });
  recordValidationAudit({
    type: "RETURN_CAPABILITY_CHECKED",
    validationId: record.validationId,
    correlationId: scope.correlationId,
  });
  recordValidationAudit({
    type: "REFUND_CAPABILITY_CHECKED",
    validationId: record.validationId,
    correlationId: scope.correlationId,
  });

  const readinessEnvironment =
    scope.environment === "STAGING" ? "SANDBOX" : scope.environment;
  const readiness = evaluateSupplierOrderReadiness(
    {
      supplierId: scope.supplierId,
      market: scope.market,
      channel: scope.channel,
      environment: readinessEnvironment,
    },
    { correlationId: scope.correlationId, force: true }
  );
  record.readinessStatus = readiness.overallStatus === "READY" ? "READY" : "BLOCKED";
  checks.push({
    check: "READINESS_INTEGRATION",
    status: readiness.overallStatus === "READY" ? "PASS" : "BLOCKED",
    message: `#337 readiness ${readiness.overallStatus} (validation PASS ≠ READY)`,
    detail: { blockers: readiness.blockers.slice(0, 5) },
  });
  if (readiness.overallStatus !== "READY") {
    blockerCodes.push("READINESS_NOT_READY");
  }
  recordValidationAudit({
    type: "READINESS_RECALCULATED",
    validationId: record.validationId,
    correlationId: scope.correlationId,
    detail: { overallStatus: readiness.overallStatus },
  });

  record.checks = checks;
  record.blockerCodes = [...new Set(blockerCodes)];
  record.riskLevel = deriveRiskLevel(record.blockerCodes);
  record.overallStatus = deriveOverallStatus(record.blockerCodes, checks);
  record.updatedAt = new Date().toISOString();

  recordValidationAudit({
    type: record.overallStatus === "PASSED" ? "VALIDATION_PASSED" : "VALIDATION_BLOCKED",
    validationId: record.validationId,
    supplierId: scope.supplierId,
    correlationId: scope.correlationId,
    detail: { overallStatus: record.overallStatus, blockerCount: record.blockerCodes.length },
  });

  saveValidationRecord(record);
  return finalize(record);
}

function finalize(record: SupplierProductionCapabilityValidation): SupplierProductionCapabilityValidation {
  assertProductionValidationSafetyInvariants();
  return record;
}
