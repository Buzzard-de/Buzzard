export type CarrierProviderId = "mock" | "dhl" | "dpd" | "gls";

export type LabelPurchaseState = "BLOCKED" | "AUTHORIZED" | "PURCHASED" | "CANCELLED" | "UNKNOWN";

export interface CarrierLabelRequest {
  shipmentId: string;
  carrierId: CarrierProviderId;
  country: string;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
  addressRef: string;
  idempotencyKey: string;
}

export interface CarrierLabelRecord {
  labelId: string;
  shipmentId: string;
  carrierId: CarrierProviderId;
  labelReference?: string;
  trackingReference?: string;
  state: LabelPurchaseState;
  dryRun: boolean;
  createdAt: string;
}

export interface CarrierProductionDashboard {
  version: string;
  productionEnabled: "DISABLED" | "ENABLED" | "BLOCKED";
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED" | "VALIDATED";
  safetyCounters: { realLabels: number; realHttpCalls: number };
  blockers: string[];
}
