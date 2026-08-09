import { isCustomerCheckoutEnabled } from "@/lib/api/config";
import { isCustomerCheckoutApiConfigured } from "./client";

export function shouldUseCustomerCheckoutApi(): boolean {
  return isCustomerCheckoutEnabled() && isCustomerCheckoutApiConfigured();
}
