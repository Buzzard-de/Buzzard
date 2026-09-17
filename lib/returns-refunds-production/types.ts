export type RecoveryStage =
  | "ESTIMATED"
  | "REQUESTED"
  | "APPROVED"
  | "RECEIVED"
  | "FINAL";

export interface SupplierRecoveryRecord {
  recoveryId: string;
  returnId: string;
  orderId: string;
  supplierId: string;
  stage: RecoveryStage;
  estimatedAmount: number;
  requestedAmount?: number;
  approvedAmount?: number;
  receivedAmount?: number;
  finalAmount?: number;
  assumed: false;
  dryRun: boolean;
  updatedAt: string;
}

export interface ReturnsRefundsProductionDashboard {
  version: string;
  productionEnabled: "DISABLED" | "ENABLED" | "BLOCKED";
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";
  safetyCounters: { realRefunds: number; assumedRecoveries: number };
  blockers: string[];
}
