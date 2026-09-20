import { canRunMarketplaceTestLevel } from "@/lib/marketplace-engine/apiTestHarness";
import { buildMarketplaceProductionCapabilityMatrix } from "@/lib/marketplace-engine/productionCapabilityMatrix";
import { listMarketplaces } from "@/lib/marketplace-engine/registry";
import type { PhaseReport } from "./types";

const CORE_MARKETPLACES = ["amazon", "ebay", "kaufland", "allegro", "bol", "cdiscount", "otto", "emag", "skroutz"];

export function evaluatePhaseC_marketplace(): PhaseReport {
  const blockers: string[] = [];
  const marketplaces = listMarketplaces().filter((m) => !m.marketplaceId.startsWith("TEST_"));

  for (const id of CORE_MARKETPLACES) {
    if (!marketplaces.some((m) => m.marketplaceId === id)) blockers.push(`MISSING_MARKETPLACE:${id}`);
  }

  const matrix = buildMarketplaceProductionCapabilityMatrix();
  if (matrix.length === 0) blockers.push("CAPABILITY_MATRIX_EMPTY");

  const level2 = canRunMarketplaceTestLevel("LEVEL_2_CONTROLLED_WRITE");
  if (level2.allowed) blockers.push("LEVEL_2_AUTO_RUN_FORBIDDEN");

  const validatedWithoutEvidence = matrix.filter((c) => c.status === "VALIDATED" && c.credentialState === "NOT_CONFIGURED");
  if (validatedWithoutEvidence.length > 0) blockers.push("FAKE_MARKETPLACE_VALIDATION");

  for (const mp of marketplaces) {
    if (mp.connectorType !== "dry-run" && process.env.MARKETPLACE_PRODUCTION_ENABLED !== "1") {
      blockers.push(`UNSAFE_CONNECTOR:${mp.marketplaceId}`);
    }
  }

  const humanRequired = matrix.some((c) => c.status === "HUMAN_REQUIRED" || c.status === "UNVERIFIED");
  const status = blockers.length === 0 ? (humanRequired ? "HUMAN_REQUIRED" : "COMPLETE") : "BLOCKED";

  return {
    phase: "C",
    label: "Marketplace Production Readiness",
    status,
    tests: "test:marketplace-engine,test:master-external-provider-readiness",
    blockers,
  };
}
