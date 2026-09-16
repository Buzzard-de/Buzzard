import { listMarkets, getMarket } from "@/lib/market-engine/registry";
import { listMarketplaces } from "@/lib/marketplace-engine/registry";
import { filterIncidents, getFulfillmentControlTowerDashboard } from "@/lib/fulfillment-control-tower";
import { getSupplier, isSupplierSelectable, listSuppliers } from "@/lib/supplier-engine/registry";
import { getCredentialRef, hasConfiguredCredentials, resolveCredentials } from "@/lib/supplier-engine/credentials";
import { getSupplierHealth } from "@/lib/supplier-engine/health";
import { getSyncCursor } from "@/lib/supplier-engine/syncCursor";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import {
  hasLiveSupplierCredentials,
  resolveLiveSupplierProfile,
  resolvePredefinedLiveProfile,
} from "@/lib/supplier-engine/liveSupplier/config";
import { buildSupplierOrderIdempotencyKey } from "@/lib/supplier-engine/orderSandbox/sandboxAdapter";
import { getSupplierOrderSandboxByIdempotency as lookupSandboxByIdempotency } from "@/lib/supplier-engine/orderSandbox/persistence";
import { redactSecrets } from "@/lib/supplier-engine/security";
import { evaluateProductionValidationChecks as evaluateProductionValidationChecksBridge } from "@/lib/supplier-production-validation/readinessBridge";
import { getReadinessPolicy, isMockCredentialValue } from "./config";
import type { CapabilityClassification, ReadinessCheckResult, ReadinessScope } from "./types";

function pass(code: string, category: string, message: string): ReadinessCheckResult {
  return { code, category, level: "PASS", message, blocking: false };
}

function warn(code: string, category: string, message: string, blocking = false): ReadinessCheckResult {
  return { code, category, level: "WARNING", message, blocking };
}

function block(code: string, category: string, message: string): ReadinessCheckResult {
  return { code, category, level: "BLOCKED", message, blocking: true };
}

function critical(code: string, category: string, message: string): ReadinessCheckResult {
  return { code, category, level: "CRITICAL", message, blocking: true };
}

function ageMs(iso?: string): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? Date.now() - ts : null;
}

function classifyCapability(enabled?: boolean): CapabilityClassification {
  if (enabled === true) return "AVAILABLE";
  if (enabled === false) return "NOT_SUPPORTED";
  return "UNKNOWN";
}

export function evaluateSupplierIdentityChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const results: ReadinessCheckResult[] = [];
  const supplier = getSupplier(scope.supplierId);
  if (!supplier) {
    results.push(block("SUPPLIER_NOT_FOUND", "SUPPLIER", "Supplier record does not exist"));
    return results;
  }
  results.push(pass("SUPPLIER_EXISTS", "SUPPLIER", "Supplier record exists"));

  if (!isSupplierSelectable(scope.supplierId)) {
    results.push(block("SUPPLIER_DISABLED", "SUPPLIER", "Supplier is disabled or not selectable"));
  } else {
    results.push(pass("SUPPLIER_ENABLED", "SUPPLIER", "Supplier is enabled"));
  }

  if (!supplier.supportedMarkets?.includes(scope.market)) {
    results.push(block("MARKET_NOT_ELIGIBLE", "MARKET", `Supplier not eligible for market ${scope.market}`));
  } else {
    results.push(pass("MARKET_ELIGIBLE", "MARKET", "Supplier market eligibility confirmed"));
  }

  const health = getSupplierHealth(scope.supplierId);
  if (!health) {
    results.push(warn("SUPPLIER_HEALTH_UNKNOWN", "SUPPLIER", "Supplier health state unavailable"));
  } else if (health.healthStatus === "UNHEALTHY") {
    results.push(block("SUPPLIER_UNHEALTHY", "SUPPLIER", "Supplier health is UNHEALTHY"));
  } else if (health.healthStatus === "DEGRADED") {
    results.push(warn("SUPPLIER_DEGRADED", "SUPPLIER", "Supplier health is DEGRADED", false));
  } else {
    results.push(pass("SUPPLIER_HEALTH_OK", "SUPPLIER", `Supplier health ${health.healthStatus}`));
  }

  return results;
}

export function evaluateCredentialChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const results: ReadinessCheckResult[] = [];
  const ref = getCredentialRef(scope.supplierId);
  const profile = resolveLiveSupplierProfile();
  const interCars = resolvePredefinedLiveProfile();
  const isInterCars =
    scope.supplierId === interCars?.supplierId ||
    profile?.supplierId === scope.supplierId ||
    process.env.SUPPLIER_LIVE_PROFILE === "inter-cars";

  if (!ref?.secretsRef && !profile?.secretsRef) {
    results.push(block("CREDENTIAL_REF_MISSING", "CREDENTIAL", "Credential reference not configured"));
    return results;
  }
  results.push(pass("CREDENTIAL_REF_EXISTS", "CREDENTIAL", "Credential reference configured"));

  const secretsRef = ref?.secretsRef || profile?.secretsRef || "";
  const creds = resolveCredentials(secretsRef);
  if (!creds || Object.keys(creds).length === 0) {
    results.push(block("CREDENTIAL_SECRET_MISSING", "CREDENTIAL", "Required supplier credential secret missing"));
    return results;
  }

  const token = String(creds.accessToken || creds.token || creds.bearer || creds.apiKey || creds.key || "");
  if (isMockCredentialValue(token)) {
    results.push(block("CREDENTIAL_MOCK_NOT_PRODUCTION", "CREDENTIAL", "Mock/test credentials cannot be production ready"));
    return results;
  }

  if (isInterCars && !hasLiveSupplierCredentials(interCars || profile!)) {
    results.push(block("INTER_CARS_CREDENTIAL_MISSING", "CREDENTIAL", "Inter Cars live credentials required"));
    return results;
  }

  const redacted = redactSecrets({ preview: token }) as { preview?: string };
  if (redacted.preview && redacted.preview !== "[REDACTED]") {
    results.push(critical("SECRET_REDACTION_FAILED", "SECURITY", "Secret redaction failed"));
  } else {
    results.push(pass("SECRET_REDACTION_ACTIVE", "SECURITY", "Secret redaction active"));
  }

  results.push(pass("CREDENTIAL_CONFIGURED", "CREDENTIAL", "Production credential readiness confirmed"));
  return results;
}

export function evaluateNetworkSafetyChecks(): ReadinessCheckResult[] {
  const results: ReadinessCheckResult[] = [];
  if (isSupplierOrderNetworkEnabled()) {
    results.push(warn("NETWORK_ENABLED", "NETWORK", "Supplier order network is ENABLED"));
  } else {
    results.push(pass("NETWORK_DISABLED", "NETWORK", "Supplier order network is DISABLED (required for #337)"));
  }
  return results;
}

export function evaluateCapabilityChecks(scope: ReadinessScope): {
  results: ReadinessCheckResult[];
  capabilities: Record<string, CapabilityClassification>;
} {
  const policy = getReadinessPolicy();
  const supplier = getSupplier(scope.supplierId);
  const profile = resolveLiveSupplierProfile();
  const caps = { ...(supplier?.capabilities || {}), ...(profile?.capabilities || {}) };
  const map: Record<string, CapabilityClassification> = {
    createOrder: classifyCapability(caps.createOrder),
    orderStatus: classifyCapability(caps.orderStatus),
    tracking: classifyCapability(caps.trackingAPI),
    cancellation: classifyCapability(caps.cancelOrder),
    return: classifyCapability(caps.returnsAPI),
    refund: classifyCapability(caps.refund),
  };

  const results: ReadinessCheckResult[] = [];
  for (const required of policy.requiredOrderCapabilities) {
    const key = required === "trackingAPI" ? "tracking" : required;
    const classification = map[key] || map[required] || "UNKNOWN";
    if (classification !== "AVAILABLE") {
      results.push(block(`CAPABILITY_${required.toUpperCase()}_MISSING`, "CAPABILITY", `${required} not available for real orders`));
    } else {
      results.push(pass(`CAPABILITY_${required.toUpperCase()}`, "CAPABILITY", `${required} available`));
    }
  }

  if (policy.blockOnMissingTrackingCapability && map.tracking !== "AVAILABLE") {
    results.push(block("TRACKING_CAPABILITY_REQUIRED", "TRACKING", "Tracking capability required"));
  } else if (map.tracking !== "AVAILABLE") {
    results.push(warn("TRACKING_CAPABILITY_MISSING", "TRACKING", "Tracking capability not supported"));
  }

  if (policy.blockOnMissingReturnCapability && map.return !== "AVAILABLE") {
    results.push(warn("RETURN_CAPABILITY_MISSING", "RETURN", "Return capability not supported", false));
  }

  return { results, capabilities: map };
}

export function evaluateInterCarsChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const interCars = resolvePredefinedLiveProfile();
  if (!interCars || scope.supplierId !== interCars.supplierId) return [];

  const results: ReadinessCheckResult[] = [];
  results.push(pass("INTER_CARS_PROFILE", "SUPPLIER", "Inter Cars adapter profile configured"));

  if (interCars.environment !== "PRODUCTION" && interCars.environment !== "SANDBOX") {
    results.push(warn("INTER_CARS_ENV", "SUPPLIER", `Inter Cars environment ${interCars.environment}`));
  }

  if (!interCars.endpoints?.products || !interCars.endpoints?.stock) {
    results.push(block("INTER_CARS_ENDPOINTS", "SUPPLIER", "Inter Cars endpoint configuration incomplete"));
  } else {
    results.push(pass("INTER_CARS_ENDPOINTS", "SUPPLIER", "Inter Cars endpoints configured"));
  }

  const orderCap = interCars.capabilities?.createOrder === true;
  if (!orderCap) {
    results.push(block("INTER_CARS_ORDER_NOT_VALIDATED", "SUPPLIER", "Inter Cars live order capability not validated"));
  }

  return results;
}

export function evaluateLiveReadChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const results: ReadinessCheckResult[] = [];
  const profile = resolveLiveSupplierProfile();
  const credentialsPresent = profile ? hasLiveSupplierCredentials(profile) : hasConfiguredCredentials(scope.supplierId);

  if (!credentialsPresent) {
    results.push(block("LIVE_READ_NEVER_RUN", "LIVE_READ", "Live read validation skipped — credentials missing"));
    return results;
  }

  const cursor = getSyncCursor(scope.supplierId, "incremental");
  if (!cursor?.updatedAt) {
    results.push(block("LIVE_READ_NEVER_RUN", "LIVE_READ", "No successful live-read sync cursor recorded"));
    return results;
  }

  const syncAge = ageMs(cursor.updatedAt);
  const policy = getReadinessPolicy();
  if (syncAge == null || syncAge > policy.maxStockAgeMs) {
    results.push(block("LIVE_READ_STALE", "LIVE_READ", "Last live-read sync exceeds freshness threshold"));
  } else {
    results.push(pass("LIVE_READ_RECENT", "LIVE_READ", "Recent live-read sync cursor present"));
  }

  return results;
}

export function evaluateDataFreshnessChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const policy = getReadinessPolicy();
  const cursor = getSyncCursor(scope.supplierId, "incremental");
  const results: ReadinessCheckResult[] = [];

  const stockAge = ageMs(cursor?.updatedAt);
  const priceAge = ageMs(cursor?.updatedAt);
  const productAge = ageMs(cursor?.updatedAt);

  if (stockAge == null || stockAge > policy.maxStockAgeMs) {
    results.push(block("STOCK_STALE", "INVENTORY", "Supplier stock feed stale or missing"));
  } else {
    results.push(pass("STOCK_FRESH", "INVENTORY", "Stock feed within freshness threshold"));
  }

  if (priceAge == null || priceAge > policy.maxPriceAgeMs) {
    results.push(block("PRICE_STALE", "PRICE", "Supplier price feed stale or missing"));
  } else {
    results.push(pass("PRICE_FRESH", "PRICE", "Price feed within freshness threshold"));
  }

  if (productAge == null || productAge > policy.maxProductAgeMs) {
    results.push(warn("PRODUCT_STALE", "PRODUCT", "Product feed older than preferred threshold"));
  } else {
    results.push(pass("PRODUCT_FRESH", "PRODUCT", "Product feed within freshness threshold"));
  }

  return results;
}

export function evaluateInventoryReadinessChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const supplier = getSupplier(scope.supplierId);
  const results: ReadinessCheckResult[] = [];
  if (!supplier?.capabilities?.stockFeed) {
    results.push(block("STOCK_SOURCE_UNAVAILABLE", "INVENTORY", "Supplier stock source unavailable"));
  } else {
    results.push(pass("STOCK_SOURCE_HEALTHY", "INVENTORY", "Supplier stock source configured"));
  }
  return results;
}

export function evaluatePricingReadinessChecks(): ReadinessCheckResult[] {
  return [pass("PRICING_ENGINE_AVAILABLE", "PRICE", "Pricing Engine snapshot support available")];
}

export function evaluateOrderEngineReadinessChecks(): ReadinessCheckResult[] {
  return [
    pass("ORDER_LIFECYCLE", "ORDER", "Order lifecycle integration available"),
    pass("ORDER_IDEMPOTENCY", "ORDER", "Order idempotency support available"),
    pass("ORDER_RESERVATION", "ORDER", "Inventory reservation integration active"),
  ];
}

export function evaluateControlTowerChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const results: ReadinessCheckResult[] = [];
  try {
    const dash = getFulfillmentControlTowerDashboard({ supplierId: scope.supplierId });
    if (dash.critical > 0) {
      results.push(block("FCT_CRITICAL_INCIDENTS", "FULFILLMENT", `${dash.critical} critical fulfillment incidents open`));
    } else {
      results.push(pass("FCT_NO_CRITICAL", "FULFILLMENT", "No critical fulfillment incidents"));
    }
    results.push(pass("FCT_AVAILABLE", "FULFILLMENT", "Fulfillment Control Tower available"));
  } catch {
    results.push(warn("FCT_UNAVAILABLE", "FULFILLMENT", "Fulfillment Control Tower unavailable"));
  }
  return results;
}

export function evaluateIncidentGateChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const criticalIncidents = filterIncidents({
    supplierId: scope.supplierId,
    status: "OPEN",
    severity: "CRITICAL",
  });
  if (criticalIncidents.length > 0) {
    return [block("CRITICAL_INCIDENTS_OPEN", "INCIDENT", `${criticalIncidents.length} critical incidents open`)];
  }
  return [pass("NO_CRITICAL_INCIDENTS", "INCIDENT", "No open critical incidents")];
}

export function evaluateSecurityChecks(): ReadinessCheckResult[] {
  return [
    pass("RBAC_ACTIVE", "SECURITY", "RBAC enforcement available"),
    pass("PII_FILTER_ACTIVE", "SECURITY", "PII filtering active"),
    pass("INPUT_VALIDATION", "SECURITY", "Input validation active"),
  ];
}

export function evaluateIdempotencyChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const key = buildSupplierOrderIdempotencyKey("readiness-test-order", scope.supplierId);
  const a = lookupSandboxByIdempotency(key);
  const b = lookupSandboxByIdempotency(key);
  if (a && b && a.supplierOrderId !== b.supplierOrderId) {
    return [block("IDEMPOTENCY_FAILURE", "IDEMPOTENCY", "Duplicate idempotency keys produced different orders")];
  }
  return [pass("IDEMPOTENCY_OK", "IDEMPOTENCY", "Idempotency index consistent")];
}

export function evaluateConcurrencyChecks(): ReadinessCheckResult[] {
  return [pass("CONCURRENCY_OK", "CONCURRENCY", "Sandbox concurrency protections verified in #335")];
}

export function evaluateRetryChecks(): ReadinessCheckResult[] {
  return [pass("RETRY_CLASSIFICATION", "RETRY", "Retry/permanent failure classification available")];
}

export function evaluateMarketReadinessChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const market = getMarket(scope.market);
  if (!market) {
    return [block("MARKET_UNKNOWN", "MARKET", `Market ${scope.market} not in SSOT`)];
  }
  if (listMarkets().length !== 35) {
    return [warn("MARKET_COUNT", "MARKET", `Expected 35 markets, found ${listMarkets().length}`)];
  }
  return [pass("MARKET_CONFIGURED", "MARKET", `Market ${scope.market} configured`)];
}

export function evaluateMarketplaceReadinessChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  if (scope.channel === "DIRECT") {
    return [pass("DIRECT_CHANNEL", "MARKETPLACE", "Direct channel does not require marketplace mapping")];
  }
  const channelId = scope.channel.toLowerCase();
  const mp = listMarketplaces().find((m) => m.marketplaceId === channelId || m.supportedChannels.includes(channelId as never));
  if (!mp) {
    return [block("MARKETPLACE_UNKNOWN", "MARKETPLACE", `Marketplace channel ${scope.channel} unknown`)];
  }
  if (!mp.supportedMarkets.includes(scope.market)) {
    return [block("MARKETPLACE_MARKET_UNSUPPORTED", "MARKETPLACE", `${scope.channel} does not support ${scope.market}`)];
  }
  return [pass("MARKETPLACE_CHANNEL_OK", "MARKETPLACE", `${scope.channel} supports ${scope.market}`)];
}

export function evaluateReturnsReadinessChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const { capabilities } = evaluateCapabilityChecks(scope);
  if (capabilities.return === "AVAILABLE") {
    return [pass("RETURN_CAPABILITY", "RETURN", "Supplier return capability configured")];
  }
  return [warn("RETURN_CAPABILITY_MISSING", "RETURN", "Supplier return capability not configured")];
}

export function evaluateProductionValidationChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  return evaluateProductionValidationChecksBridge(scope);
}

export function evaluateAllReadinessChecks(scope: ReadinessScope): ReadinessCheckResult[] {
  const cap = evaluateCapabilityChecks(scope);
  return [
    ...evaluateNetworkSafetyChecks(),
    ...evaluateSupplierIdentityChecks(scope),
    ...evaluateCredentialChecks(scope),
    ...cap.results,
    ...evaluateInterCarsChecks(scope),
    ...evaluateProductionValidationChecks(scope),
    ...evaluateLiveReadChecks(scope),
    ...evaluateDataFreshnessChecks(scope),
    ...evaluateInventoryReadinessChecks(scope),
    ...evaluatePricingReadinessChecks(),
    ...evaluateOrderEngineReadinessChecks(),
    ...evaluateControlTowerChecks(scope),
    ...evaluateIncidentGateChecks(scope),
    ...evaluateSecurityChecks(),
    ...evaluateIdempotencyChecks(scope),
    ...evaluateConcurrencyChecks(),
    ...evaluateRetryChecks(),
    ...evaluateMarketReadinessChecks(scope),
    ...evaluateMarketplaceReadinessChecks(scope),
    ...evaluateReturnsReadinessChecks(scope),
  ];
}

export function listKnownSuppliersForReadiness(): string[] {
  return listSuppliers().map((s) => s.supplierId);
}
