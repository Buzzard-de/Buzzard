export type ReadinessCheck = {
  name: string;
  status: "PASS" | "WARNING" | "FAIL" | "UNKNOWN";
  detail?: string;
};

export type CommerceReadiness = {
  overall: "READY" | "NOT_READY" | "BLOCKED";
  score: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  salesBlocked: boolean;
  checks: ReadinessCheck[];
  blockers: ReadinessCheck[];
  warnings: ReadinessCheck[];
};

export type CommerceFeatureFlags = {
  salesEnabled: boolean;
  checkoutEnabled: boolean;
  checkoutDryRunOnly: boolean;
  paymentEnabled: boolean;
  supplierOrdersEnabled: boolean;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  mockPaymentOnly: boolean;
};

export type CommerceHealth = {
  enabled: boolean;
  sales: { salesEnabled: boolean; catalogMode: boolean };
  readiness: string;
  ordersByType: Record<string, number>;
};

export type GoLiveRequest = {
  id: string;
  requested_by: string | null;
  status: string;
  admin_approval: number;
  production_lock: number;
  created_at: string;
};
