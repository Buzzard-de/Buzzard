import type { IntegrationType, SupplierCapabilities, SupplierConfig } from "./types";
import type { SupplierAuthType, SupplierConnectorEnvironment } from "./network/types";

export interface SupplierOnboardingDefinition {
  supplierId: string;
  connectorType: IntegrationType;
  environment: SupplierConnectorEnvironment;
  endpointRef?: string;
  authType: SupplierAuthType;
  secretsRef: string;
  capabilities: SupplierCapabilities;
  supportedMarkets: string[];
  active: boolean;
}

export type SupplierOnboardingStep =
  | "SUPPLIER_DEFINITION"
  | "CONNECTOR_SELECTION"
  | "CREDENTIAL_REFERENCE"
  | "CAPABILITY_DECLARATION"
  | "MARKET_ELIGIBILITY"
  | "HEALTH_CHECK"
  | "TEST_SYNC"
  | "ACTIVE";

export interface SupplierOnboardingState {
  supplierId: string;
  currentStep: SupplierOnboardingStep;
  completedSteps: SupplierOnboardingStep[];
  readyForActivation: boolean;
}

export function validateSupplierOnboardingDefinition(def: SupplierOnboardingDefinition): string[] {
  const errors: string[] = [];
  if (!def.supplierId) errors.push("MISSING_SUPPLIER_ID");
  if (!def.connectorType) errors.push("MISSING_CONNECTOR_TYPE");
  if (!def.secretsRef) errors.push("MISSING_SECRETS_REF");
  if (!def.supportedMarkets?.length) errors.push("MISSING_MARKETS");
  if (!def.capabilities.productFeed && !def.capabilities.stockFeed && !def.capabilities.priceFeed) {
    errors.push("MISSING_FEED_CAPABILITY");
  }
  return errors;
}

export function buildOnboardingState(
  def: SupplierOnboardingDefinition,
  checks: { healthPassed?: boolean; testSyncPassed?: boolean }
): SupplierOnboardingState {
  const completed: SupplierOnboardingStep[] = ["SUPPLIER_DEFINITION", "CONNECTOR_SELECTION"];
  if (def.secretsRef) completed.push("CREDENTIAL_REFERENCE");
  if (Object.values(def.capabilities).some(Boolean)) completed.push("CAPABILITY_DECLARATION");
  if (def.supportedMarkets.length) completed.push("MARKET_ELIGIBILITY");
  if (checks.healthPassed) completed.push("HEALTH_CHECK");
  if (checks.testSyncPassed) completed.push("TEST_SYNC");
  if (def.active && checks.healthPassed && checks.testSyncPassed) completed.push("ACTIVE");

  const currentStep = completed[completed.length - 1] || "SUPPLIER_DEFINITION";
  return {
    supplierId: def.supplierId,
    currentStep,
    completedSteps: completed,
    readyForActivation: checks.healthPassed === true && checks.testSyncPassed === true,
  };
}

export function onboardingDefinitionFromSupplier(supplier: SupplierConfig): SupplierOnboardingDefinition {
  return {
    supplierId: supplier.supplierId,
    connectorType: supplier.integrationTypes[0] || "manual",
    environment: "MOCK",
    endpointRef: undefined,
    authType: "NONE",
    secretsRef: supplier.secretsRef || "",
    capabilities: supplier.capabilities,
    supportedMarkets: supplier.supportedMarkets,
    active: supplier.status !== "DISABLED" && supplier.status !== "PAUSED",
  };
}
