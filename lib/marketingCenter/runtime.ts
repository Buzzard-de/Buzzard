import { isMarketingCenterEnabled } from "@/lib/api/config";
import { isMarketingCenterApiConfigured } from "./client";

export function shouldUseMarketingCenterApi(): boolean {
  return isMarketingCenterEnabled() && isMarketingCenterApiConfigured();
}
