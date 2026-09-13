import { hasConfiguredCredentials } from "./credentials";
import { hasLiveSupplierCredentials, isLiveReadEnabled, resolveLiveSupplierProfile } from "./liveSupplier/config";
import { getSupplier } from "./registry";
import { isSupplierNetworkEnabled, resolveConnectorEnvironment } from "./network";
import { evaluateProductionSyncGuard } from "./syncGuard";

export interface LiveReadGuardResult {
  allowed: boolean;
  reasons: string[];
  skipped?: boolean;
  skipReason?: string;
}

export function evaluateLiveReadSyncGuard(supplierId: string, jobType = "FULL"): LiveReadGuardResult {
  if (!isLiveReadEnabled()) {
    return { allowed: false, reasons: ["LIVE_READ_DISABLED"] };
  }

  if (!isSupplierNetworkEnabled()) {
    return { allowed: false, reasons: ["NETWORK_DISABLED"] };
  }

  const profile = resolveLiveSupplierProfile();
  if (!profile || profile.supplierId !== supplierId) {
    return { allowed: false, reasons: ["LIVE_SUPPLIER_NOT_CONFIGURED"] };
  }

  const environment = resolveConnectorEnvironment(profile.environment);
  if (environment === "MOCK") {
    return { allowed: false, reasons: ["MOCK_ENVIRONMENT"] };
  }

  const guard = evaluateProductionSyncGuard(supplierId, jobType, {
    baseUrl: profile.baseUrl,
    environment: profile.environment,
    secretsRef: profile.secretsRef,
  });

  const supplier = getSupplier(supplierId);
  if (supplier?.capabilities.orderAPI || supplier?.capabilities.createOrder) {
    return { allowed: false, reasons: ["WRITE_CAPABILITIES_NOT_ALLOWED"] };
  }

  if (!hasConfiguredCredentials(supplierId) && !profile.secretsRef) {
    guard.reasons.push("CREDENTIALS_MISSING");
  }

  return { allowed: guard.allowed, reasons: guard.reasons };
}

export function hasLiveSupplierCredentialsConfigured(): boolean {
  const profile = resolveLiveSupplierProfile();
  if (!profile) return false;
  return hasLiveSupplierCredentials(profile);
}
