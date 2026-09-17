import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { getPaymentProductionDashboard } from "@/lib/payment-production/admin";
import { getCarrierProductionDashboard } from "@/lib/carrier-production/admin";
import { getReturnsRefundsProductionDashboard } from "@/lib/returns-refunds-production/admin";
import { getAiProductionDashboard } from "@/lib/ai-production/admin";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";
import { evaluateBackupGate } from "@/lib/production-completion/backupGate";
import { evaluateSecurityGate } from "@/lib/production-completion/securityGate";
import { isSalesEnabled } from "./config";
import type { GoLiveChecklistItem } from "./types";

function toGateStatus(access: string): GoLiveChecklistItem["status"] {
  if (access === "VALIDATED" || access === "PASS" || access === "EXECUTED" || access === "COMPLETED" || access === "ARMED" || access === "ACTIVE") return "PASS";
  if (access === "CONFIGURED") return "UNVERIFIED";
  if (access === "NOT_CONFIGURED" || access === "NONE") return "NOT_CONFIGURED";
  if (access === "BLOCKED" || access === "FAILED") return "BLOCKED";
  return "UNVERIFIED";
}

/** Maps 09_GO_LIVE/FINAL_CHECKLIST.md items to diagnostic status (never fakes PASS). */
export function buildGoLiveChecklist(): GoLiveChecklistItem[] {
  const interCars = evaluateInterCarsProductionAccess();
  const accessDash = getProductionAccessDashboard();
  const payment = getPaymentProductionDashboard();
  const carrier = getCarrierProductionDashboard();
  const returns = getReturnsRefundsProductionDashboard();
  const ai = getAiProductionDashboard();
  const security = evaluateSecurityGate();
  const backup = evaluateBackupGate();
  const killSwitchActive = isProductionKillSwitchActive();

  return [
    { id: "website_checkout", label: "Website/checkout", status: "UNVERIFIED", mandatory: true },
    { id: "international_35_markets", label: "35 markets/VAT/currency/shipping", status: "UNVERIFIED", mandatory: true },
    { id: "product_pim", label: "Product/PIM/translations", status: "UNVERIFIED", mandatory: true },
    {
      id: "inter_cars_create_order",
      label: "Inter Cars live access + createOrder validation",
      status: interCars.createOrderCapability === "VALIDATED" ? "PASS" : "UNVERIFIED",
      mandatory: true,
    },
    { id: "inventory_order_fulfillment", label: "Inventory/order/supplier fulfillment", status: "UNVERIFIED", mandatory: true },
    { id: "marketplace_production", label: "Marketplace production", status: "UNVERIFIED", mandatory: true },
    { id: "payment_production", label: "Payment production", status: toGateStatus(payment.liveStatus), mandatory: true },
    { id: "carrier_tracking", label: "Carrier + tracking", status: toGateStatus(carrier.liveStatus), mandatory: true },
    { id: "returns_refunds", label: "Returns/refunds", status: toGateStatus(returns.liveStatus), mandatory: true },
    { id: "ai_provider_security", label: "AI provider/security", status: toGateStatus(ai.liveStatus), mandatory: true },
    { id: "arming_complete", label: "#343 arming complete", status: toGateStatus(accessDash.armingState), mandatory: true },
    { id: "first_order_complete", label: "#344 first order complete", status: toGateStatus(accessDash.firstOrderState), mandatory: true },
    { id: "controlled_go_live", label: "#345 controlled go-live", status: toGateStatus(accessDash.controlledGoLive), mandatory: true },
    { id: "observation_complete", label: "#346 observation complete", status: toGateStatus(String(accessDash.observationState)), mandatory: true },
    { id: "monitoring_alerts", label: "Monitoring/alerts", status: "UNVERIFIED", mandatory: true },
    { id: "backup_recovery", label: "Backup/recovery", status: backup.status === "PASS" ? "PASS" : backup.status === "BLOCKED" ? "BLOCKED" : "UNVERIFIED", mandatory: true },
    { id: "analytics", label: "Analytics", status: "UNVERIFIED", mandatory: true },
    { id: "legal_compliance", label: "Legal/compliance", status: "UNVERIFIED", mandatory: true },
    { id: "customer_support", label: "Customer support", status: "UNVERIFIED", mandatory: true },
    { id: "rollback_kill_switches", label: "Rollback/kill switches", status: killSwitchActive ? "BLOCKED" : "PASS", mandatory: true },
    { id: "security_gate", label: "Security final gate", status: security.status === "PASS" ? "PASS" : security.status === "BLOCKED" ? "BLOCKED" : "UNVERIFIED", mandatory: true },
    { id: "four_eyes_approval", label: "Four-eyes approval", status: "UNVERIFIED", mandatory: true },
    {
      id: "sales_closed",
      label: "Sales closed until all mandatory gates PASS",
      status: isSalesEnabled() ? "BLOCKED" : "PASS",
      mandatory: true,
    },
  ];
}
