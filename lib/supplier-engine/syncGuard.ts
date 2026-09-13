import { hasConfiguredCredentials } from "./credentials";
import { getSupplierHealth } from "./health";
import { getSupplier } from "./registry";
import { isSupplierNetworkEnabled, resolveConnectorEnvironment } from "./network";
import type { ConnectorConfig, SupplierCapabilities } from "./types";

export interface ProductionSyncGuardResult {
  allowed: boolean;
  reasons: string[];
}

function hasFeedCapability(capabilities: SupplierCapabilities, jobType: string): boolean {
  if (jobType === "STOCK_ONLY") return Boolean(capabilities.stockFeed);
  if (jobType === "PRICE_ONLY") return Boolean(capabilities.priceFeed);
  return Boolean(capabilities.productFeed);
}

export function evaluateProductionSyncGuard(
  supplierId: string,
  jobType: string,
  connectorConfig: ConnectorConfig = {}
): ProductionSyncGuardResult {
  const reasons: string[] = [];
  const supplier = getSupplier(supplierId);
  if (!supplier) {
    return { allowed: false, reasons: ["UNKNOWN_SUPPLIER"] };
  }

  const active = supplier.status !== "DISABLED" && supplier.status !== "PAUSED";
  if (!active) reasons.push("SUPPLIER_INACTIVE");

  const environment = resolveConnectorEnvironment(connectorConfig.environment);
  if (environment !== "MOCK" && !isSupplierNetworkEnabled()) {
    reasons.push("NETWORK_DISABLED");
  }

  const credentialsOk =
    hasConfiguredCredentials(supplierId) || Boolean(supplier.secretsRef || connectorConfig.secretsRef);
  if (environment !== "MOCK" && !credentialsOk) {
    reasons.push("CREDENTIALS_MISSING");
  }

  if (!hasFeedCapability(supplier.capabilities, jobType)) {
    reasons.push("CAPABILITY_NOT_SUPPORTED");
  }

  const health = getSupplierHealth(supplierId);
  if (health.consecutiveFailures >= 5 && environment === "PRODUCTION") {
    reasons.push("HEALTH_CHECK_FAILED");
  }

  if (connectorConfig.baseUrl && environment !== "MOCK") {
    if (!connectorConfig.baseUrl.startsWith("https://") && environment === "PRODUCTION") {
      reasons.push("ENDPOINT_INVALID");
    }
  }

  return { allowed: reasons.length === 0, reasons };
}
