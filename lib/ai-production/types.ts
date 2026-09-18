export type AiProductionProviderId = "mock" | "openai" | "anthropic" | "google";

export type AiProductionAuthority = "OBSERVE" | "ANALYZE" | "RECOMMEND" | "EXECUTE_BLOCKED";

export type AiWorkerId =
  | "PRODUCT_AI"
  | "SUPPLIER_AI"
  | "PRICING_AI"
  | "INVENTORY_AI"
  | "ORDER_AI"
  | "MARKETPLACE_AI"
  | "CUSTOMS_AI"
  | "CUSTOMER_SERVICE_AI"
  | "RETURNS_AI"
  | "FINANCE_AI";

export interface AiProductionDashboard {
  version: string;
  productionEnabled: "DISABLED" | "ENABLED" | "BLOCKED";
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED" | "VALIDATED";
  defaultAuthority: AiProductionAuthority;
  workers: AiWorkerId[];
  safetyCounters: { realProviderCalls: number; blockedExecutions: number };
  blockers: string[];
}
