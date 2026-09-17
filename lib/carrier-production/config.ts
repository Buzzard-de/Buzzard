import { isProductionFlagEnabled } from "@/lib/production-defaults";
import type { CarrierProviderId } from "./types";

export const CARRIER_PRODUCTION_VERSION = "351.1.0";

export function isCarrierProductionEnabled(): boolean {
  return isProductionFlagEnabled("CARRIER_PRODUCTION");
}

export function getDefaultCarrierId(): CarrierProviderId {
  const id = (process.env.CARRIER_PROVIDER || "mock").toLowerCase();
  if (id === "dhl" || id === "dpd" || id === "gls") return id;
  return "mock";
}
