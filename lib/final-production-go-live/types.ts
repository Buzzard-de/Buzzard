export type GoLivePhase =
  | "NOT_READY"
  | "READY"
  | "APPROVED"
  | "ENABLED"
  | "CONTROLLED_GO_LIVE"
  | "OBSERVATION"
  | "BROADER_ROLLOUT"
  | "PRODUCTION";

export type GateCheckStatus = "PASS" | "FAIL" | "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";

export interface FinalGateCheck {
  domain: string;
  check: string;
  status: GateCheckStatus;
  message: string;
}

export interface MarketingProviderStatus {
  providerId: string;
  configured: boolean;
  spendEnabled: false | true;
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";
}

export interface GoLiveChecklistItem {
  id: string;
  label: string;
  status: GateCheckStatus;
  mandatory: true;
}

export interface FinalProductionGoLiveDashboard {
  version: string;
  phase: GoLivePhase;
  salesEnabled: "CLOSED" | "OPEN";
  marketingSpendEnabled: "OFF" | "ON";
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";
  checks: FinalGateCheck[];
  mandatoryChecklist: GoLiveChecklistItem[];
  marketingProviders: MarketingProviderStatus[];
  safetyCounters: {
    realSupplierOrders: number;
    realPayments: number;
    realRefunds: number;
    realCarrierLabels: number;
    realMarketplaceMutations: number;
    realMarketingSpend: number;
  };
  blockers: string[];
}
