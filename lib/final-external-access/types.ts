import type { AccessStatus } from "@/lib/production-access/types";

export type ExternalAccessStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "BLOCKED"
  | "UNVERIFIED"
  | "VALIDATED"
  | "READY"
  | "ENABLED";

export type MarketPreflightStatus = "PASS" | "WARNING" | "BLOCKED";

export interface ExternalAccessEntry {
  provider: string;
  environment: "MOCK" | "SANDBOX" | "PRODUCTION";
  credentialSecretRef: string;
  credentialConfigured: boolean;
  credentialValid: boolean;
  endpointConfigured: boolean;
  endpointReachable: boolean;
  capabilityDeclared: boolean;
  capabilityValidated: boolean;
  liveNetworkEnabled: boolean;
  productionReady: boolean;
  status: ExternalAccessStatus;
  blockingReason: string;
  requiredHumanApproval: boolean;
  lastValidationTimestamp?: string;
  evidenceReference?: string;
}

export interface GoLiveDependencyStep {
  id: string;
  label: string;
  status: ExternalAccessStatus | "BLOCKED" | "COMPLETE";
  blockingReason?: string;
  requiredHumanApproval?: boolean;
}

export interface Market35PreflightEntry {
  countryCode: string;
  country: boolean;
  locale: boolean;
  currency: boolean;
  vat: boolean;
  b2c: boolean;
  b2b: boolean;
  shipping: boolean;
  supplierEligibility: boolean;
  supplierOrigin: boolean;
  customs: boolean;
  carrier: boolean;
  payment: boolean;
  returns: boolean;
  availability: boolean;
  tradeRouteSample?: string;
  status: MarketPreflightStatus;
  warnings: string[];
}

export interface ExternalAccessPreflightReport {
  generatedAt: string;
  softwareComplete: boolean;
  configComplete: boolean;
  externalAccessComplete: boolean;
  liveValidationComplete: boolean;
  productionReady: boolean;
  goLiveReady: boolean;
  salesEnabled: string;
  externalAccessMatrix: ExternalAccessEntry[];
  market35Preflight: Market35PreflightEntry[];
  goLiveDependencyGraph: GoLiveDependencyStep[];
  blockers: string[];
  warnings: string[];
  nextRequiredActions: string[];
  counters: {
    realSupplierOrders: number;
    realPaymentTransactions: number;
    realRefunds: number;
    realShipments: number;
    realTrackingEvents: number;
    realMarketplaceOrders: number;
    realMarketplaceListings: number;
    realMarketingSpend: number;
    fakeEvidence: number;
  };
  productionFlags: Record<string, string>;
}
