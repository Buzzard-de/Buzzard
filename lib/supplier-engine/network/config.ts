import type { SupplierConnectorEnvironment } from "./types";

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true";
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const SUPPLIER_NETWORK_CONFIG = {
  get networkEnabled() {
    return envFlag("SUPPLIER_NETWORK_ENABLED", false);
  },
  get orderNetworkEnabled() {
    return envFlag("SUPPLIER_ORDER_NETWORK_ENABLED", false);
  },
  defaultEnvironment: "MOCK" as SupplierConnectorEnvironment,
  defaultTimeoutMs: envInt("SUPPLIER_HTTP_TIMEOUT_MS", 30_000),
  maxResponseBytes: envInt("SUPPLIER_MAX_RESPONSE_BYTES", 5 * 1024 * 1024),
  maxRetries: envInt("SUPPLIER_HTTP_MAX_RETRIES", 3),
  maxConcurrentRequests: envInt("SUPPLIER_MAX_CONCURRENT_REQUESTS", 5),
};

export function isSupplierNetworkEnabled(): boolean {
  return envFlag("SUPPLIER_NETWORK_ENABLED", false);
}

export function isSupplierOrderNetworkEnabled(): boolean {
  return envFlag("SUPPLIER_ORDER_NETWORK_ENABLED", false);
}

export function resolveConnectorEnvironment(
  configured?: SupplierConnectorEnvironment
): SupplierConnectorEnvironment {
  return configured || SUPPLIER_NETWORK_CONFIG.defaultEnvironment;
}

export function canUseProductionNetwork(environment: SupplierConnectorEnvironment): boolean {
  if (environment === "MOCK") return false;
  if (environment === "PRODUCTION" && !isSupplierNetworkEnabled()) return false;
  if (environment === "SANDBOX" && !isSupplierNetworkEnabled()) return false;
  return true;
}
