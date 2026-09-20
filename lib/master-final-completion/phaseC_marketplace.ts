import { buildMarketplaceMasterRows } from "@/lib/master-external-provider-readiness/marketplaceReadiness";
import { listMarketplaces } from "@/lib/marketplace-engine/registry";
import type { PhaseReport } from "./types";

const CAPABILITY_KEYS = [
  "AUTH",
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRICE_SYNC",
  "STOCK_SYNC",
  "ORDER_IMPORT",
  "ORDER_STATUS",
  "SHIPMENT",
  "TRACKING",
  "RETURN",
  "REFUND",
] as const;

export function evaluatePhaseC_marketplace(): PhaseReport {
  const blockers: string[] = [];
  const marketplaces = listMarketplaces();
  if (marketplaces.length === 0) blockers.push("MARKETPLACE_REGISTRY_EMPTY");

  const expectedIds = ["amazon", "ebay", "kaufland", "allegro", "bol", "cdiscount", "otto", "emag", "skroutz"];
  for (const id of expectedIds) {
    if (!marketplaces.some((m) => m.marketplaceId === id)) blockers.push(`MISSING_MARKETPLACE:${id}`);
  }

  const rows = buildMarketplaceMasterRows();
  for (const row of rows) {
    if (row.credentialState === "VALIDATED" && row.liveValidation !== "VALIDATED") {
      blockers.push(`FAKE_MARKETPLACE_VALIDATION:${row.provider}`);
    }
    if (row.networkState !== "DISABLED") {
      blockers.push(`MARKETPLACE_NETWORK_NOT_DISABLED:${row.provider}`);
    }
  }

  for (const mp of marketplaces) {
    if (mp.connectorType !== "dry-run" && process.env.MARKETPLACE_PRODUCTION_ENABLED !== "1") {
      blockers.push(`UNSAFE_CONNECTOR:${mp.marketplaceId}`);
    }
  }

  if (CAPABILITY_KEYS.length < 11) blockers.push("CAPABILITY_MATRIX_INCOMPLETE");

  const liveValidated = rows.filter((r) => r.liveValidation === "VALIDATED").length;
  const status = blockers.length === 0 ? (liveValidated > 0 ? "PARTIAL" : "HUMAN_REQUIRED") : "BLOCKED";

  return {
    phase: "C",
    label: "Marketplace Production Readiness",
    status,
    tests: "test:marketplace-engine,test:master-external-provider-readiness",
    blockers,
  };
}
