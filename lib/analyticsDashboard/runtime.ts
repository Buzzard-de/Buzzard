import { isAnalyticsDashboardEnabled } from "@/lib/api/config";
import { isAnalyticsDashboardApiConfigured } from "./client";

export function shouldUseAnalyticsDashboardApi(): boolean {
  return isAnalyticsDashboardEnabled() && isAnalyticsDashboardApiConfigured();
}
