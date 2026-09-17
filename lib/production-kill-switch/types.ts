export type KillSwitchDomain =
  | "SUPPLIER_ORDERS"
  | "PAYMENTS"
  | "CARRIER"
  | "REFUNDS"
  | "MARKETING_SPEND"
  | "SALES";

export interface GlobalProductionKillSwitchState {
  global: boolean;
  domains: Record<KillSwitchDomain, boolean>;
  updatedAt: string;
  updatedBy?: string;
  correlationId?: string;
  reason?: string;
}
