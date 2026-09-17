import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { isSalesEnabled } from "./config";
import type { GoLiveChecklistItem } from "./types";

/** Maps 09_GO_LIVE/FINAL_CHECKLIST.md items to diagnostic status (never fakes PASS). */
export function buildGoLiveChecklist(): GoLiveChecklistItem[] {
  const interCars = evaluateInterCarsProductionAccess();

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
    { id: "payment_production", label: "Payment production", status: "NOT_CONFIGURED", mandatory: true },
    { id: "carrier_tracking", label: "Carrier + tracking", status: "NOT_CONFIGURED", mandatory: true },
    { id: "returns_refunds", label: "Returns/refunds", status: "NOT_CONFIGURED", mandatory: true },
    { id: "ai_provider_security", label: "AI provider/security", status: "UNVERIFIED", mandatory: true },
    { id: "monitoring_alerts", label: "Monitoring/alerts", status: "UNVERIFIED", mandatory: true },
    { id: "backup_recovery", label: "Backup/recovery", status: "UNVERIFIED", mandatory: true },
    { id: "analytics", label: "Analytics", status: "UNVERIFIED", mandatory: true },
    { id: "legal_compliance", label: "Legal/compliance", status: "UNVERIFIED", mandatory: true },
    { id: "customer_support", label: "Customer support", status: "UNVERIFIED", mandatory: true },
    { id: "rollback_kill_switches", label: "Rollback/kill switches", status: "PASS", mandatory: true },
    { id: "four_eyes_approval", label: "Four-eyes approval", status: "PASS", mandatory: true },
    {
      id: "sales_closed",
      label: "Sales closed until all mandatory gates PASS",
      status: isSalesEnabled() ? "BLOCKED" : "PASS",
      mandatory: true,
    },
  ];
}
