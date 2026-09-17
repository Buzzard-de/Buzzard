/** Shared production safety defaults — all OFF unless explicitly enabled. */

export type ProductionFlag =
  | "SUPPLIER_NETWORK"
  | "SUPPLIER_LIVE_READ"
  | "SUPPLIER_ORDER_NETWORK"
  | "PAYMENT_PRODUCTION"
  | "CARRIER_PRODUCTION"
  | "RETURNS_PRODUCTION"
  | "MARKETING_SPEND"
  | "AI_PRODUCTION"
  | "SALES";

const FLAG_ENV: Record<ProductionFlag, string> = {
  SUPPLIER_NETWORK: "SUPPLIER_NETWORK_ENABLED",
  SUPPLIER_LIVE_READ: "SUPPLIER_LIVE_READ_ENABLED",
  SUPPLIER_ORDER_NETWORK: "SUPPLIER_ORDER_NETWORK_ENABLED",
  PAYMENT_PRODUCTION: "PAYMENT_PRODUCTION_ENABLED",
  CARRIER_PRODUCTION: "CARRIER_PRODUCTION_ENABLED",
  RETURNS_PRODUCTION: "RETURNS_PRODUCTION_ENABLED",
  MARKETING_SPEND: "MARKETING_SPEND_ENABLED",
  AI_PRODUCTION: "AI_PRODUCTION_ENABLED",
  SALES: "SALES_ENABLED",
};

export function isProductionFlagEnabled(flag: ProductionFlag): boolean {
  const envKey = FLAG_ENV[flag];
  const value = process.env[envKey];
  return value === "1" || value === "true";
}

export function assertProductionFlagDisabled(flag: ProductionFlag, context: string): void {
  if (isProductionFlagEnabled(flag)) {
    throw new Error(`${context}:PRODUCTION_FLAG_ENABLED:${flag}`);
  }
}

export function getProductionFlagsSnapshot(): Record<ProductionFlag, "ON" | "OFF"> {
  const out = {} as Record<ProductionFlag, "ON" | "OFF">;
  for (const flag of Object.keys(FLAG_ENV) as ProductionFlag[]) {
    out[flag] = isProductionFlagEnabled(flag) ? "ON" : "OFF";
  }
  return out;
}

export function enforceCiProductionSafety(context: string): void {
  if (process.env.CI === "true" || process.env.NODE_ENV === "test") {
    for (const flag of Object.keys(FLAG_ENV) as ProductionFlag[]) {
      assertProductionFlagDisabled(flag, context);
    }
  }
}
