export type CredentialDisplayStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "VALID"
  | "INVALID"
  | "EXPIRED"
  | "BLOCKED";

export type LiveValidationPrepStatus = "READY" | "BLOCKED" | "NOT_RUN";

export type ReadOnlyLiveStatus = "VALIDATED" | "NOT_RUN" | "BLOCKED";

export interface ProductionAccessChecklistItem {
  id: string;
  label: string;
  status: "PASS" | "BLOCKED" | "UNVERIFIED";
  message: string;
}

export interface ProductionAccessDiagnostic {
  interCarsProfile: "CONFIGURED" | "NOT_CONFIGURED";
  environment: string;
  supplierProfile: string;
  productionCredentials: CredentialDisplayStatus;
  credentialType: string;
  readOnlyLiveValidation: ReadOnlyLiveStatus;
  stageAHandoff: "READY_FOR_STAGE_B_342" | "BLOCKED" | "NOT_RUN";
  handoffStage343: "READY_FOR_343_ARMING" | "BLOCKED";
  controlledLiveValidation: LiveValidationPrepStatus;
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  productionNetwork: "ON" | "OFF";
  supplierOrderNetwork: "ON" | "OFF";
  scopedValidationNetwork: "ON" | "OFF";
  realHttpCalls: number;
  realCreateOrderCalls: number;
  realSupplierOrders: number;
  realCustomerOrders: number;
  checklist: ProductionAccessChecklistItem[];
  blockers: string[];
  correlationId: string;
  evaluatedAt: string;
}
