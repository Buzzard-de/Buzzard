import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { countRejectedEvidenceAttempts } from "@/lib/final-closure/evidencePolicy";
import type { SideEffectCounters } from "./types";

export function captureSideEffectCounters(): SideEffectCounters {
  const c = getFinalGoLiveSafetyCounters();
  return {
    realSupplierOrders: c.realSupplierOrders,
    realPaymentTransactions: c.realPayments,
    realRefunds: c.realRefunds,
    realShipments: c.realCarrierLabels,
    realMarketplaceOrders: c.realMarketplaceMutations,
    realMarketplaceListings: 0,
    realAdSpend: c.realMarketingSpend,
    fakeEvidence: countRejectedEvidenceAttempts(),
  };
}

export function assertZeroSideEffects(counters: SideEffectCounters): string[] {
  const violations: string[] = [];
  if (counters.realSupplierOrders !== 0) violations.push(`realSupplierOrders=${counters.realSupplierOrders}`);
  if (counters.realPaymentTransactions !== 0) violations.push(`realPaymentTransactions=${counters.realPaymentTransactions}`);
  if (counters.realRefunds !== 0) violations.push(`realRefunds=${counters.realRefunds}`);
  if (counters.realShipments !== 0) violations.push(`realShipments=${counters.realShipments}`);
  if (counters.realMarketplaceOrders !== 0) violations.push(`realMarketplaceOrders=${counters.realMarketplaceOrders}`);
  if (counters.realMarketplaceListings !== 0) violations.push(`realMarketplaceListings=${counters.realMarketplaceListings}`);
  if (counters.realAdSpend !== 0) violations.push(`realAdSpend=${counters.realAdSpend}`);
  if (counters.fakeEvidence !== 0) violations.push(`fakeEvidence=${counters.fakeEvidence}`);
  return violations;
}
