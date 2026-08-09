import { isCustomerSupportEnabled } from "@/lib/api/config";
import { isCustomerSupportApiConfigured } from "./client";

export function shouldUseCustomerSupportApi(): boolean {
  return isCustomerSupportEnabled() && isCustomerSupportApiConfigured();
}
