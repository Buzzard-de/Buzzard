import { isCrmLoyaltyEnabled } from "@/lib/api/config";
import { isCrmLoyaltyApiConfigured } from "./client";

export function shouldUseCrmLoyaltyApi(): boolean {
  return isCrmLoyaltyEnabled() && isCrmLoyaltyApiConfigured();
}
