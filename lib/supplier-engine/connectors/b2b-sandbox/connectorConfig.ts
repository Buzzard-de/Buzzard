import type { ConnectorConfig, SupplierConfig } from "../../types";
import type { LiveSupplierProfile } from "../../liveSupplier/types";

export function resolveB2bProfile(supplier: SupplierConfig): LiveSupplierProfile | null {
  return supplier.connectorProfile || null;
}

export function profileToConnectorConfig(profile: LiveSupplierProfile): ConnectorConfig {
  return {
    baseUrl: profile.baseUrl,
    environment: profile.environment,
    authentication: profile.authentication,
    authType: profile.authType,
    secretsRef: profile.secretsRef,
    allowedEndpoints: profile.allowedEndpoints || [new URL(profile.baseUrl).hostname],
    pagination: profile.pagination
      ? { pageSize: profile.pagination.pageSize || 100, ...profile.pagination }
      : undefined,
    timeoutMs: 30_000,
  };
}
