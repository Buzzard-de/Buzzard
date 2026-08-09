import { isMarketplaceHubEnabled } from "@/lib/api/config";
import { isMarketplaceHubApiConfigured } from "./client";

export function shouldUseMarketplaceHubApi(): boolean {
  return isMarketplaceHubEnabled() && isMarketplaceHubApiConfigured();
}
