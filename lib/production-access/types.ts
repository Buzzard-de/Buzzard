export type AccessStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "NOT_AVAILABLE"
  | "UNVERIFIED"
  | "BLOCKED"
  | "VALIDATED";

export interface SecretRefStatus {
  providerId: string;
  secretRefKey: string;
  secretRefConfigured: boolean;
  secretResolvable: boolean;
  credentialStatus: AccessStatus;
}

export interface AccessChecklistItem {
  id: string;
  label: string;
  status: AccessStatus;
  required: true;
}

export interface ProviderAccessReport {
  providerId: string;
  domain: string;
  secretRef: SecretRefStatus;
  checklist: AccessChecklistItem[];
  liveValidation: AccessStatus;
  productionEnabled: "OFF" | "ON" | "BLOCKED";
  blockers: string[];
}

export interface MissingProductionAccessReport {
  generatedAt: string;
  providers: ProviderAccessReport[];
  interCars: ProviderAccessReport;
  liveSequence: {
    phase1Access: AccessStatus;
    phase2Supplier: AccessStatus;
    phase3Providers: AccessStatus;
    phase4Final: AccessStatus;
  };
  realWorldChecklist: AccessChecklistItem[];
  productionFlags: Record<string, "ON" | "OFF">;
  realSideEffects: Record<string, number>;
  sales: "CLOSED" | "OPEN";
  blockers: string[];
}
