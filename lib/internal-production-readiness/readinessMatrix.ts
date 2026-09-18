import { existsSync } from "fs";
import path from "path";
import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { buildExternalAccessMatrix } from "@/lib/final-external-access/externalAccessMatrix";
import { validateAll35Markets } from "@/lib/market-engine/market35Validation";
import { evaluateFinalSecurityGate } from "@/lib/final-closure/securityGate";
import { getBackupRestoreEvidence } from "@/lib/final-closure/backupRestore";
import { buildProductionMonitoringSnapshot } from "@/lib/production-completion/monitoringDashboard";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";
import { buildGoLiveDependencyGraph, getCurrentBlockingStep } from "@/lib/final-external-access/goLiveDependencyGraph";
import type { ReadinessMatrixEntry, ReadinessStatus } from "./types";

function entry(area: string, status: ReadinessStatus, ssot: string, tests: string, notes: string): ReadinessMatrixEntry {
  return { area, status, ssot, tests, notes };
}

function fileExists(rel: string): boolean {
  return existsSync(path.join(process.cwd(), rel));
}

export function buildReadinessMatrix(): ReadinessMatrixEntry[] {
  const external = buildExternalAccessMatrix();
  const market35 = validateAll35Markets();
  const flags = getProductionFlagsSnapshot();
  const security = evaluateFinalSecurityGate();
  const backup = getBackupRestoreEvidence();
  const monitoring = buildProductionMonitoringSnapshot();
  const graph = buildGoLiveDependencyGraph();
  const blocker = getCurrentBlockingStep(graph);

  const interCars = external.find((e) => e.provider === "INTER CARS");
  const payment = external.find((e) => e.provider === "PAYMENT");
  const carrier = external.find((e) => e.provider === "CARRIER");
  const deployment = external.find((e) => e.provider === "DEPLOYMENT");
  const storage = external.find((e) => e.provider === "PERSISTENT STORAGE");

  const allFlagsOff = Object.values(flags).every((v) => v === "OFF");
  const legalPages = ["/app/impressum/page.tsx", "/app/datenschutz/page.tsx", "/app/agb/page.tsx", "/app/widerruf/page.tsx"];
  const legalPresent = legalPages.every((p) => fileExists(p));

  return [
    entry("PRODUCT", "PASS", "lib/product-engine", "test:product-engine", "Product Engine SSOT with catalog pipeline"),
    entry(
      "SUPPLIER",
      interCars?.status === "BLOCKED" ? "BLOCKED" : "PASS",
      "lib/supplier-engine + lib/supplier-engine/internationalOrigin.ts",
      "test:supplier-engine",
      interCars?.blockingReason ?? "Dropship model — supplier stock is source of truth",
    ),
    entry("INVENTORY", "PASS", "lib/inventory-engine", "test:inventory-engine", "No Buzzard warehouse stock; saleable = available - buffer - reserved"),
    entry("PRICING", "PASS", "lib/pricing-engine", "test:pricing-engine", "Integer-cent formula with margin, VAT, rounding; no duplicate engine"),
    entry("ORDER", "PASS", "lib/order-engine", "test:order-engine", "Cart → checkout → reservation → trade route → supplier prep"),
    entry(
      "MARKETPLACE",
      external.some(
        (e) =>
          (["AMAZON", "EBAY", "OTHER MARKETPLACES"].includes(e.provider) ||
            e.blockingReason?.includes("MARKETPLACE")) &&
          e.status !== "VALIDATED",
      )
        ? "BLOCKED"
        : "PASS",
      "lib/marketplace-engine",
      "test:marketplace-engine",
      "External marketplace credentials not configured",
    ),
    entry("RETURNS", "PASS", "lib/returns-engine", "test:returns-engine", "Customer refund ≠ supplier recovery; no auto-restock"),
    entry("ANALYTICS", "PASS", "lib/analytics", "test:analytics", "KPI + storefront + persistence integration"),
    entry(
      "AI",
      external.find((e) => e.provider === "AI")?.status === "BLOCKED" ? "WARNING" : "PASS",
      "lib/ai-orchestrator + lib/ai-workers",
      "test:ai-orchestrator",
      "OBSERVE/ANALYZE/RECOMMEND only; no autonomous procurement or payments",
    ),
    entry("CUSTOMS", "PASS", "lib/customs-fulfillment-gate", "test:trade-route-fulfillment", "Uses existing product customs; AI must not invent HS codes"),
    entry("TRADE_ROUTE", "PASS", "lib/trade-route-fulfillment", "test:trade-route-fulfillment", "EU/NON-EU/SAME_COUNTRY/UNKNOWN routes; UNKNOWN never defaults EU"),
    entry("SHIPPING", "PASS", "lib/trade-route-fulfillment/quoteShipping.ts", "test:trade-route-fulfillment", "Integrated with order engine post-payment"),
    entry(
      "CARRIER",
      carrier?.status === "BLOCKED" ? "BLOCKED" : "WARNING",
      "lib/carrier-production + lib/trade-route-fulfillment/carrierSelection.ts",
      "test:carrier-production",
      carrier?.blockingReason ?? "Dry-run profiles only; no label creation",
    ),
    entry(
      "PAYMENT",
      payment?.status === "BLOCKED" ? "BLOCKED" : "WARNING",
      "lib/payment-production",
      "test:payment-production",
      payment?.blockingReason ?? "Architecture only; no live transactions",
    ),
    entry(
      "FINANCE",
      "WARNING",
      "lib/returns-engine + lib/returns-refunds-production",
      "test:returns-refunds-production",
      "Reconciliation chain present; live validation blocked without credentials",
    ),
    entry("I18N", "PASS", "lib/i18n/international", "test:buzzard-i18n", "Country→language auto/manual override; RTL Arabic supported"),
    entry(
      "35_MARKETS",
      market35.valid ? "PASS" : "WARNING",
      "data/global/global_countries_35.json + lib/market-engine",
      "test:market-engine",
      market35.valid ? "All 35 markets validated via SSOT" : market35.errors.join(";"),
    ),
    entry("CHECKOUT", fileExists("components/CheckoutForm.tsx") ? "PASS" : "MISSING", "components/CheckoutForm.tsx + lib/checkout", "test:part18", "Country, VAT, shipping, payment, legal refs; SALES disabled"),
    entry(
      "SECURITY",
      security.status === "PASS" ? "PASS" : security.status === "BLOCKED" ? "BLOCKED" : "WARNING",
      "lib/final-closure/securityGate.ts",
      "test:production-kill-switch",
      security.blockers.join(",") || "RBAC, SSRF, idempotency, kill switch",
    ),
    entry(
      "MONITORING",
      monitoring.healthStatus === "HEALTHY" ? "PASS" : "WARNING",
      "lib/production-completion/monitoringDashboard.ts",
      "test:production-completion",
      `Health: ${monitoring.healthStatus}`,
    ),
    entry(
      "BACKUP",
      backup.result === "PASS" ? "PASS" : backup.result === "BLOCKED" ? "BLOCKED" : "WARNING",
      "lib/final-closure/backupRestore.ts",
      "test:backup-restore",
      backup.result,
    ),
    entry(
      "DEPLOYMENT",
      deployment?.status === "BLOCKED" ? "BLOCKED" : "WARNING",
      "server/lib/dbPaths.js",
      "verify-db-persistence",
      deployment?.blockingReason ?? "Render manual verification required",
    ),
    entry(
      "PERSISTENCE",
      storage?.status === "BLOCKED" ? "BLOCKED" : "WARNING",
      "server/lib/dbPaths.js + PERSISTENT_DATA_PATH",
      "verify-db-persistence",
      storage?.blockingReason ?? "Requires /var/data on Render",
    ),
    entry(
      "LEGAL_PAGE_TECHNICAL_PRESENCE",
      legalPresent ? "PASS" : "WARNING",
      "app/impressum, app/datenschutz, app/agb, app/widerruf",
      "sitemap",
      legalPresent ? "Legal pages present; business content may need review" : "Missing legal page routes",
    ),
    entry(
      "PRODUCTION_FLAGS",
      allFlagsOff ? "PASS" : "BLOCKED",
      "lib/production-defaults",
      "test:production-access",
      allFlagsOff ? "All production flags OFF" : "UNEXPECTED FLAG ON — AUDIT FAILURE",
    ),
    entry(
      "KILL_SWITCH",
      isProductionKillSwitchActive() ? "PASS" : "WARNING",
      "lib/production-kill-switch",
      "test:production-kill-switch",
      "Production kill switch infrastructure present",
    ),
    entry(
      "HUMAN_APPROVAL",
      blocker?.requiredHumanApproval ? "BLOCKED" : "WARNING",
      "lib/final-external-access/goLiveDependencyGraph.ts",
      "test:final-external-access",
      blocker?.blockingReason ?? "Four-eyes approval chain #342–#346 pending",
    ),
    entry(
      "EXTERNAL_ACCESS",
      external.every((e) => ["VALIDATED", "ENABLED", "READY"].includes(e.status)) ? "PASS" : "BLOCKED",
      "lib/final-external-access/externalAccessMatrix.ts",
      "test:final-external-access",
      "External credentials and live validation required",
    ),
  ];
}
