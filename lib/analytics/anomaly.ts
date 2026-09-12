import { computeFunnelMetrics } from "./funnel";
import { computeRevenueMetrics } from "./revenue";

export interface AnalyticsAnomaly {
  code: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export function detectAnalyticsAnomalies(): AnalyticsAnomaly[] {
  const anomalies: AnalyticsAnomaly[] = [];
  const funnel = computeFunnelMetrics();
  const revenue = computeRevenueMetrics();

  if (funnel.purchases > funnel.checkoutStart) {
    anomalies.push({
      code: "FUNNEL_INCONSISTENCY",
      message: "Purchases exceed checkout starts",
      severity: "HIGH",
    });
  }

  if (revenue.grossRevenueCents < 0) {
    anomalies.push({
      code: "NEGATIVE_REVENUE",
      message: "Negative gross revenue detected",
      severity: "HIGH",
    });
  }

  if (funnel.overallConversionRate > 100) {
    anomalies.push({
      code: "INVALID_CONVERSION",
      message: "Conversion rate exceeds 100%",
      severity: "MEDIUM",
    });
  }

  return anomalies;
}
