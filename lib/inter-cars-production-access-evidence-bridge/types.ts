import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";

export type InterCarsCredentialBridgeState =
  | "NOT_CONFIGURED"
  | "REFERENCE_PRESENT"
  | "VALUE_PRESENT_UNVERIFIED"
  | "VALIDATED"
  | "EXPIRED"
  | "INVALID";

export type InterCarsEvidenceSource = "INTER_CARS_LIVE" | "LOCAL" | "SANDBOX" | "MOCK" | "UNIT_TEST";

export type InterCarsCapabilityId =
  | "health"
  | "catalog"
  | "products"
  | "stock"
  | "pricing"
  | "createOrder"
  | "cancelOrder"
  | "orderStatus"
  | "tracking"
  | "returns"
  | "refund";

export type InterCarsCapabilityLiveStatus =
  | "NOT_CONFIGURED"
  | "UNVERIFIED"
  | "LIVE_READ_VALIDATED"
  | "ORDER_VALIDATED"
  | "BLOCKED_EXTERNAL_ACCESS"
  | "HUMAN_REQUIRED";

export interface InterCarsCredentialEvidenceInput {
  providerId: "inter-cars";
  environment: "PRODUCTION" | "CONTROLLED_VALIDATION";
  source: InterCarsEvidenceSource;
  credentialType: string;
  secretRef: string;
  validationMethod: string;
  timestamp: string;
  endpoint: string;
  responseStatus: number;
  capability: InterCarsCapabilityId;
  evidenceReference: string;
  operator: string;
  expiresAt?: string;
}

export interface InterCarsCredentialEvidence extends InterCarsCredentialEvidenceInput {
  id: string;
  payloadHash: string;
}

export interface InterCarsCapabilityMatrixRow {
  capability: InterCarsCapabilityId;
  configured: boolean;
  credentialRequired: boolean;
  credentialAvailable: boolean;
  endpointConfigured: boolean;
  networkAllowed: boolean;
  liveValidated: boolean;
  productionEvidence: boolean;
  humanApprovalRequired: boolean;
  status: InterCarsCapabilityLiveStatus;
}

export interface InterCarsProductionAccessBridgeReport {
  generatedAt: string;
  credentialReference: InterCarsCredentialBridgeState;
  credentialValidation: ControlCenterStatus;
  readOnlyAccess: ControlCenterStatus;
  capabilities: InterCarsCapabilityMatrixRow[];
  createOrder: InterCarsCapabilityLiveStatus;
  stage342Gate: "UNVERIFIED" | "VALIDATED" | "BLOCKED";
  blockers: string[];
  humanActionCount: number;
  nextHumanAction?: string;
  fakeProductionEvidence: number;
  realSideEffects: number;
}
