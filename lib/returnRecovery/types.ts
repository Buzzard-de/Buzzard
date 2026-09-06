export type ReturnRecoveryRow = {
  id: string;
  orderId: string;
  orderLineId: string;
  productId?: string | null;
  status: string;
  reason: string;
  customerRefundAmount: number;
  supplierRecoveryExpected: number;
  supplierRecoveryConfirmed: number;
  unrecoveredAmount: number;
  supplierLiability: string;
  lastAction?: string;
  warnings?: string[];
  inspectionSummary?: string;
  supplierClaimStatus?: string;
  creditNoteSummary?: string;
  inspection?: {
    condition?: string;
    resellable?: boolean;
    inspectionStatus?: string;
  };
  supplierClaim?: { status?: string };
  creditNotes?: Array<{ creditNoteNumber?: string; creditNoteStatus?: string; verified?: boolean }>;
};

export type ReturnRecoverySafety = {
  salesEnabled: boolean;
  paymentsEnabled: boolean;
  supplierLiveEnabled: boolean;
  diagnosticOnly: boolean;
  dryRunDefault: boolean;
};

export type ReturnRecoveryListResponse = {
  success: boolean;
  returns: ReturnRecoveryRow[];
  safety: ReturnRecoverySafety;
};
