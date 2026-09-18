import { isProductionFlagEnabled } from "@/lib/production-defaults";

export const RETURNS_REFUNDS_PRODUCTION_VERSION = "353.1.0";

export function isReturnsProductionEnabled(): boolean {
  return isProductionFlagEnabled("RETURNS_PRODUCTION");
}
