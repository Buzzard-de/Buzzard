import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";

export const PRODUCTION_ACCESS_VERSION = "342-prep.1.0";

export function getInterCarsSupplierId(): string {
  return resolvePredefinedLiveProfile()?.supplierId || "SUP-INTER-CARS-001";
}

export function isInterCarsProfileConfigured(): boolean {
  return Boolean(resolvePredefinedLiveProfile());
}
