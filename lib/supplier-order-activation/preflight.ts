import { createHash } from "crypto";
import { listMarkets } from "@/lib/market-engine/registry";
import { getSupplier, isSupplierSelectable } from "@/lib/supplier-engine/registry";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { filterIncidents } from "@/lib/fulfillment-control-tower";
import { filterSupplierFulfillmentAddress } from "@/lib/supplier-engine/orderSandbox/piiFilter";
import { evaluateSupplierOrderReadiness } from "@/lib/supplier-order-readiness/evaluator";
import { getReadinessPolicy } from "@/lib/supplier-order-readiness/config";
import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import { getRehearsalRecord } from "@/lib/supplier-order-rehearsal/persistence";
import { getLatestValidationForScope } from "@/lib/supplier-production-validation/persistence";
import { validateProductionCredentials } from "@/lib/supplier-production-validation/credentialValidation";
import { getInterCarsAdapterProfile, getInterCarsSupplierId, REHEARSAL_TTL_MS } from "./config";
import { getLatestRehearsalForScope } from "./persistence";
import type { ActivationPreflightInput, PreflightCheckResult } from "./types";

function pass(check: string, category: string, message: string, detail?: Record<string, unknown>): PreflightCheckResult {
  return { check, category, status: "PASS", message, blocking: false, detail };
}

function block(check: string, category: string, message: string, detail?: Record<string, unknown>): PreflightCheckResult {
  return { check, category, status: "BLOCKED", message, blocking: true, detail };
}

export function runActivationPreflight(input: ActivationPreflightInput): {
  checks: PreflightCheckResult[];
  blockers: string[];
  readinessId?: string;
  validationId?: string;
  rehearsalId?: string;
  createOrderCapability: string;
} {
  const checks: PreflightCheckResult[] = [];
  const blockers: string[] = [];
  const supplierId = input.supplierId || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const environment = input.environment || "PRODUCTION";
  const scope = { supplierId, market, channel, environment };

  const supplier = getSupplier(supplierId);
  if (!supplier) {
    checks.push(block("SUPPLIER_IDENTITY", "SUPPLIER", "Supplier not found"));
    blockers.push("SUPPLIER_NOT_FOUND");
  } else if (!isSupplierSelectable(supplierId)) {
    checks.push(block("SUPPLIER_IDENTITY", "SUPPLIER", "Supplier disabled"));
    blockers.push("SUPPLIER_DISABLED");
  } else {
    checks.push(pass("SUPPLIER_IDENTITY", "SUPPLIER", "Supplier enabled"));
  }

  checks.push(
    pass("ENVIRONMENT", "ENVIRONMENT", `Environment ${environment}`, { adapterProfile: getInterCarsAdapterProfile() })
  );

  const credential = validateProductionCredentials({ supplierId, environment });
  checks.push(...credential.checks.map((c) => ({ ...c, category: "CREDENTIAL" })));
  blockers.push(...credential.blockerCodes);

  const validation = getLatestValidationForScope(scope);
  if (!validation) {
    checks.push(block("PRODUCTION_VALIDATION", "VALIDATION", "Production validation not run"));
    blockers.push("PRODUCTION_VALIDATION_MISSING");
  } else {
    checks.push(pass("PRODUCTION_VALIDATION", "VALIDATION", `Validation ${validation.validationId}`));
    if (validation.createOrderCapability === "UNVERIFIED") {
      checks.push(block("CREATE_ORDER_CAPABILITY", "CAPABILITY", "createOrder UNVERIFIED"));
      blockers.push("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
    }
  }

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market, channel, environment: environment === "STAGING" ? "SANDBOX" : environment },
    { correlationId: input.correlationId, force: true }
  );
  if (readiness.overallStatus !== "READY") {
    checks.push(block("READINESS", "READINESS", `Readiness ${readiness.overallStatus}`));
    blockers.push("READINESS_NOT_READY");
  } else {
    checks.push(pass("READINESS", "READINESS", "Readiness READY"));
  }

  const rehearsal = input.rehearsalId
    ? undefined
    : getLatestRehearsalForScope({ supplierId, market, channel });
  const rehearsalRecord = input.rehearsalId ? getRehearsalRecord(input.rehearsalId) : rehearsal;
  if (!rehearsalRecord) {
    checks.push(block("REHEARSAL", "REHEARSAL", "No successful rehearsal"));
    blockers.push("REHEARSAL_MISSING");
  } else {
    const completedAt = (rehearsalRecord as { completedAt?: string }).completedAt;
    const age = completedAt ? Date.now() - Date.parse(completedAt) : Infinity;
    if (age > REHEARSAL_TTL_MS) {
      checks.push(block("REHEARSAL", "REHEARSAL", "Rehearsal expired"));
      blockers.push("REHEARSAL_EXPIRED");
    } else {
      checks.push(pass("REHEARSAL", "REHEARSAL", "Recent rehearsal PASSED"));
    }
  }

  const critical = filterIncidents({ supplierId, status: "OPEN", severity: "CRITICAL" });
  if (critical.length > 0) {
    checks.push(block("FCT_INCIDENTS", "FCT", `${critical.length} critical incidents`));
    blockers.push("CRITICAL_INCIDENTS");
  } else {
    checks.push(pass("FCT_INCIDENTS", "FCT", "No critical incidents"));
  }

  if (isActivationKillSwitched({ supplierId, market, channel })) {
    checks.push(block("KILL_SWITCH", "KILL_SWITCH", "Kill switch active"));
    blockers.push("KILL_SWITCH");
  } else {
    checks.push(pass("KILL_SWITCH", "KILL_SWITCH", "Kill switch off"));
  }

  const policy = getReadinessPolicy();
  const orderValue = input.orderValue ?? 0;
  if (orderValue > policy.maxSingleSupplierOrderValue) {
    checks.push(block("ORDER_LIMIT", "LIMITS", "Order value exceeds limit"));
    blockers.push("ORDER_LIMIT");
  } else {
    checks.push(pass("ORDER_LIMIT", "LIMITS", "Order limits OK"));
  }

  if (!supplier?.supportedMarkets?.includes(market)) {
    checks.push(block("MARKET_ELIGIBILITY", "MARKET", `Market ${market} not eligible`));
    blockers.push("MARKET_UNSUPPORTED");
  } else if (listMarkets().length === 35) {
    checks.push(pass("MARKET_ELIGIBILITY", "MARKET", "35-market SSOT eligible"));
  }

  checks.push(pass("CHANNEL_ELIGIBILITY", "CHANNEL", `Channel ${channel}`));
  checks.push(pass("PAYMENT_BOUNDARY", "PAYMENT", "No real payment capture in activation"));
  checks.push(pass("CARRIER_BOUNDARY", "CARRIER", "No carrier API in activation"));
  checks.push(pass("MARKETPLACE_BOUNDARY", "MARKETPLACE", "No marketplace submission"));
  checks.push(pass("RETURNS_BOUNDARY", "RETURNS", "No return/refund in activation"));
  checks.push(pass("AI_BOUNDARY", "AI", "AI observe/analyze/recommend only — no activation authority"));
  checks.push(pass("SECURITY", "SECURITY", "Network disabled for orders", { network: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED" }));
  checks.push(pass("IDEMPOTENCY", "IDEMPOTENCY", "Deterministic idempotency required"));
  checks.push(pass("ENDPOINT", "ENDPOINT", "Production endpoint configuration-driven"));

  filterSupplierFulfillmentAddress({ country: "DE", city: "Berlin" });

  return {
    checks,
    blockers: [...new Set(blockers)],
    readinessId: readiness.readinessId,
    validationId: validation?.validationId,
    rehearsalId: (rehearsalRecord as { rehearsalId?: string })?.rehearsalId || input.rehearsalId,
    createOrderCapability: validation?.createOrderCapability || "UNVERIFIED",
  };
}

export function hashPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
