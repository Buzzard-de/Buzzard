import { evaluateLiveReadSyncGuard } from "@/lib/supplier-engine/liveReadGuard";
import { isLiveReadEnabled, resolveLiveSupplierProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { isSupplierNetworkEnabled } from "@/lib/supplier-engine/network";
import { validateSupplierEndpoint, extractAllowedHosts } from "@/lib/supplier-engine/network/allowlist";
import { recordReadCall } from "./safety";
import type { CapabilityStatus, ValidationCheckResult } from "./types";

export type LiveReadTransport = (
  url: string,
  init: { method: string; headers: Record<string, string> }
) => Promise<{ ok: boolean; status: number; body: string; contentType?: string }>;

let transportOverride: LiveReadTransport | null = null;

export function setLiveReadTransportForTests(fn: LiveReadTransport | null): void {
  transportOverride = fn;
}

async function defaultTransport(
  url: string,
  init: { method: string; headers: Record<string, string> }
): Promise<{ ok: boolean; status: number; body: string; contentType?: string }> {
  const res = await fetch(url, { method: init.method, headers: init.headers });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body, contentType: res.headers.get("content-type") || undefined };
}

export interface LiveReadValidationResult {
  healthStatus: CapabilityStatus;
  catalogReadStatus: CapabilityStatus;
  stockReadStatus: CapabilityStatus;
  priceReadStatus: CapabilityStatus;
  liveReadTimestamp?: string;
  checks: ValidationCheckResult[];
  skipped: boolean;
  skipReason?: string;
}

export async function runReadOnlyLiveValidation(input: {
  supplierId: string;
  allowLiveRead?: boolean;
}): Promise<LiveReadValidationResult> {
  const checks: ValidationCheckResult[] = [];
  const profile = resolveLiveSupplierProfile();
  const skippedResult = (reason: string): LiveReadValidationResult => ({
    healthStatus: "SKIPPED",
    catalogReadStatus: "SKIPPED",
    stockReadStatus: "SKIPPED",
    priceReadStatus: "SKIPPED",
    checks: [{ check: "LIVE_READ", status: "SKIPPED", message: reason }],
    skipped: true,
    skipReason: reason,
  });

  if (!input.allowLiveRead) {
    return skippedResult("Live read not requested");
  }

  if (!isLiveReadEnabled()) {
    return skippedResult("SUPPLIER_LIVE_READ_ENABLED is not active");
  }

  if (!isSupplierNetworkEnabled()) {
    return skippedResult("SUPPLIER_NETWORK_ENABLED is disabled");
  }

  const guard = evaluateLiveReadSyncGuard(input.supplierId);
  if (!guard.allowed) {
    return skippedResult(`Live read guard blocked: ${guard.reasons.join(",")}`);
  }

  if (!profile) {
    return skippedResult("Live supplier profile missing");
  }

  const transport = transportOverride || defaultTransport;
  const allowedHosts = extractAllowedHosts(profile.baseUrl, profile.allowedEndpoints || []);
  const headers = { Accept: "application/json", ...(profile.requestHeaders || {}) };
  const timestamp = new Date().toISOString();

  async function probe(name: string, path: string): Promise<{ ok: boolean; message: string }> {
    const url = new URL(path, profile!.baseUrl).toString();
    const endpointCheck = validateSupplierEndpoint(url, allowedHosts);
    if (!endpointCheck.allowed) {
      return { ok: false, message: endpointCheck.reason || "Endpoint blocked" };
    }
    recordReadCall(name as "health" | "catalog" | "stock" | "price");
    const res = await transport(url, { method: "GET", headers });
    if (res.status >= 500) return { ok: false, message: `HTTP ${res.status}` };
    if (res.status === 429) return { ok: false, message: "RATE_LIMITED" };
    if (!res.ok && res.status >= 400) return { ok: false, message: `HTTP ${res.status}` };
    if (res.body.length > 2_000_000) return { ok: false, message: "RESPONSE_TOO_LARGE" };
    return { ok: true, message: "OK" };
  }

  const health = await probe("health", profile.endpoints?.health || "/health");
  checks.push({
    check: "HEALTH_READ",
    status: health.ok ? "PASS" : "FAIL",
    message: health.message,
  });

  const catalog = await probe("catalog", `${profile.endpoints?.products || "/products"}?pageSize=1&pageNumber=1`);
  checks.push({
    check: "CATALOG_READ",
    status: catalog.ok ? "PASS" : "FAIL",
    message: catalog.message,
  });

  const stock = await probe("stock", profile.endpoints?.stock || "/stock");
  checks.push({
    check: "STOCK_READ",
    status: stock.ok ? "PASS" : "FAIL",
    message: stock.message,
  });

  const price = await probe("price", profile.endpoints?.prices || "/prices");
  checks.push({
    check: "PRICE_READ",
    status: price.ok ? "PASS" : "FAIL",
    message: price.message,
  });

  const toStatus = (ok: boolean): CapabilityStatus => (ok ? "LIVE_READ_VALIDATED" : "BLOCKED");

  return {
    healthStatus: toStatus(health.ok),
    catalogReadStatus: toStatus(catalog.ok),
    stockReadStatus: toStatus(stock.ok),
    priceReadStatus: toStatus(price.ok),
    liveReadTimestamp: timestamp,
    checks,
    skipped: false,
  };
}
