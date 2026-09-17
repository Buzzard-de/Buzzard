import { enforceCiProductionSafety } from "@/lib/production-defaults";
import { getFulfillmentSafetyCounters } from "@/lib/first-order-fulfillment/safety";
import { getPaymentProductionSafetyCounters } from "@/lib/payment-production/safety";
import { getReturnsRefundsSafetyCounters } from "@/lib/returns-refunds-production/safety";
import { getCarrierProductionSafetyCounters } from "@/lib/carrier-production/safety";

const counters = { realMarketplaceMutations: 0, realMarketingSpend: 0 };

export function getFinalGoLiveSafetyCounters() {
  const fulfillment = getFulfillmentSafetyCounters();
  const payment = getPaymentProductionSafetyCounters();
  const returns = getReturnsRefundsSafetyCounters();
  const carrier = getCarrierProductionSafetyCounters();
  return {
    realSupplierOrders: fulfillment.realSupplierOrders,
    realPayments: payment.realCharges,
    realRefunds: returns.realRefunds,
    realCarrierLabels: carrier.realLabels,
    realMarketplaceMutations: counters.realMarketplaceMutations,
    realMarketingSpend: counters.realMarketingSpend,
  };
}

export function resetFinalGoLiveSafetyCountersForTests(): void {
  counters.realMarketplaceMutations = 0;
  counters.realMarketingSpend = 0;
}

export function assertFinalGoLiveSafety(): void {
  enforceCiProductionSafety("FINAL_354");
}

export function assertFinalGoLiveSafetyInvariants(): { ok: boolean; violations: string[] } {
  const c = getFinalGoLiveSafetyCounters();
  const violations: string[] = [];
  if (c.realSupplierOrders !== 0) violations.push(`realSupplierOrders=${c.realSupplierOrders}`);
  if (c.realPayments !== 0) violations.push(`realPayments=${c.realPayments}`);
  if (c.realRefunds !== 0) violations.push(`realRefunds=${c.realRefunds}`);
  if (c.realCarrierLabels !== 0) violations.push(`realCarrierLabels=${c.realCarrierLabels}`);
  if (c.realMarketplaceMutations !== 0) violations.push(`realMarketplaceMutations=${c.realMarketplaceMutations}`);
  if (c.realMarketingSpend !== 0) violations.push(`realMarketingSpend=${c.realMarketingSpend}`);
  return { ok: violations.length === 0, violations };
}
