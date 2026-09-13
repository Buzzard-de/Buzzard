import { createConnector } from "./connectors/factory";
import { hasConfiguredCredentials } from "./credentials";
import { recordSupplierHealthFailure, recordSupplierHealthSuccess } from "./health";
import { resolveSupplierAuth } from "./auth";
import { validateSupplierEndpoint, extractAllowedHosts } from "./network/allowlist";
import { canUseProductionNetwork, resolveConnectorEnvironment } from "./network/config";
import { getSupplierOrThrow } from "./registry";
import type { ConnectorConfig } from "./types";

export type ConnectionTestStatus =
  | "CONNECTED"
  | "AUTH_FAILED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "ENDPOINT_INVALID"
  | "CAPABILITY_NOT_SUPPORTED"
  | "NETWORK_DISABLED"
  | "CREDENTIALS_MISSING";

export interface ConnectionTestResult {
  status: ConnectionTestStatus;
  latencyMs: number;
  connector: string;
  environment: string;
  message: string;
  checkedAt: string;
}

export async function runSupplierConnectionTest(
  supplierId: string,
  connectorConfig: ConnectorConfig = {}
): Promise<ConnectionTestResult> {
  const started = Date.now();
  const supplier = getSupplierOrThrow(supplierId);
  const integrationType = supplier.integrationTypes[0] ?? "manual";
  const environment = resolveConnectorEnvironment(connectorConfig.environment);
  const connector = createConnector(supplier, integrationType, connectorConfig);

  const credentialsOk =
    hasConfiguredCredentials(supplierId) || Boolean(supplier.secretsRef || connectorConfig.secretsRef);

  if (environment !== "MOCK" && !credentialsOk) {
    return finish(started, {
      status: "CREDENTIALS_MISSING",
      connector: integrationType,
      environment,
      message: "Credential reference not configured",
    });
  }

  if (connectorConfig.baseUrl) {
    const endpointCheck = validateSupplierEndpoint(
      connectorConfig.baseUrl,
      extractAllowedHosts(connectorConfig.baseUrl)
    );
    if (!endpointCheck.allowed) {
      return finish(started, {
        status: "ENDPOINT_INVALID",
        connector: integrationType,
        environment,
        message: endpointCheck.reason || "Endpoint blocked",
      });
    }
  }

  if (environment !== "MOCK" && !canUseProductionNetwork(environment)) {
    return finish(started, {
      status: "NETWORK_DISABLED",
      connector: integrationType,
      environment,
      message: "Supplier network is disabled",
    });
  }

  const auth = resolveSupplierAuth({
    ...connectorConfig,
    secretsRef: connectorConfig.secretsRef || supplier.secretsRef,
  });

  if (environment !== "MOCK" && !auth.configured) {
    return finish(started, {
      status: "AUTH_FAILED",
      connector: integrationType,
      environment,
      message: "Authentication credentials could not be resolved",
    });
  }

  try {
    const connectResult = await connector.connect();
    if (!connectResult.ok) {
      const status = connectResult.message.includes("CAPABILITY")
        ? "CAPABILITY_NOT_SUPPORTED"
        : "ENDPOINT_INVALID";
      recordSupplierHealthFailure(supplierId, { errorCode: status, responseTimeMs: Date.now() - started });
      return finish(started, {
        status,
        connector: integrationType,
        environment,
        message: connectResult.message,
      });
    }

    const health = await connector.healthCheck();
    recordSupplierHealthSuccess(supplierId, {
      responseTimeMs: health.latencyMs,
      operation: "connection_test",
    });

    return finish(started, {
      status: health.status === "UNHEALTHY" ? "ENDPOINT_INVALID" : "CONNECTED",
      connector: integrationType,
      environment,
      message: health.lastError || "Connection test successful",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection test failed";
    const code = (err as { code?: string }).code;
    let status: ConnectionTestStatus = "ENDPOINT_INVALID";
    if (code === "AUTH_FAILED" || code === "FORBIDDEN") status = "AUTH_FAILED";
    if (code === "TIMEOUT") status = "TIMEOUT";
    if (code === "RATE_LIMITED") status = "RATE_LIMITED";
    recordSupplierHealthFailure(supplierId, { errorCode: status, responseTimeMs: Date.now() - started });
    return finish(started, { status, connector: integrationType, environment, message });
  }
}

function finish(
  started: number,
  partial: Omit<ConnectionTestResult, "latencyMs" | "checkedAt">
): ConnectionTestResult {
  return {
    ...partial,
    latencyMs: Date.now() - started,
    checkedAt: new Date().toISOString(),
  };
}
