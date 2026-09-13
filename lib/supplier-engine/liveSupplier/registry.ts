import type { SupplierConfig } from "../types";
import type { LiveSupplierProfile } from "./types";
import { resolveLiveSupplierProfile } from "./config";
import { registerCredentialRef } from "../credentials";

let registeredLiveSupplierId: string | null = null;

export function getRegisteredLiveSupplierId(): string | null {
  return registeredLiveSupplierId;
}

export function liveProfileToSupplierConfig(profile: LiveSupplierProfile): SupplierConfig {
  const now = new Date().toISOString();
  return {
    supplierId: profile.supplierId,
    name: profile.name,
    displayName: profile.displayName || profile.name,
    country: profile.country,
    region: profile.region,
    status: "TESTING",
    integrationTypes: ["b2b-sandbox"],
    currency: profile.currency,
    supportedMarkets: profile.supportedMarkets,
    supportedCategories: [],
    capabilities: profile.capabilities,
    fieldMapping: profile.fieldMapping,
    secretsRef: profile.secretsRef,
    rateLimit: { requestsPerMinute: 60 },
    connectorProfile: profile,
    createdAt: now,
    updatedAt: now,
  };
}

export function registerLiveSupplierIfConfigured(
  register: (config: SupplierConfig) => void
): LiveSupplierProfile | null {
  const profile = resolveLiveSupplierProfile();
  if (!profile) return null;
  register(liveProfileToSupplierConfig(profile));
  registerCredentialRef(profile.supplierId, profile.secretsRef);
  registeredLiveSupplierId = profile.supplierId;
  return profile;
}
