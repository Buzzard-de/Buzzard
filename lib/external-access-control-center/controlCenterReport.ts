import { getProductionFlagsSnapshot, isProductionFlagEnabled } from "@/lib/production-defaults";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { countRejectedEvidenceAttempts } from "@/lib/production-access/evidencePolicy";
import { buildExternalAccessPreflightReport } from "@/lib/final-external-access/preflightReport";
import { runMarket35Preflight } from "@/lib/final-external-access/market35Preflight";
import { validateRenderBlueprint } from "@/lib/production-storage-preflight/renderBlueprintValidation";
import { evaluateFinalSecurityGate } from "@/lib/final-closure/securityGate";
import { getBackupRestoreEvidence } from "@/lib/final-closure/backupRestore";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";
import { buildProviderRegistry, buildAccessMatrixRows } from "./masterProviderRegistry";
import { collectEvidenceRecords } from "./evidenceEngine";
import { buildExtendedGoLiveGraph } from "./goLiveControlGraph";
import { buildNextHumanActions } from "./humanActions";
import type { BuzzardFinalStatusScoreboard, ExternalAccessControlCenterReport } from "./types";

export function buildExternalAccessControlCenterReport(): ExternalAccessControlCenterReport {
  const preflight = buildExternalAccessPreflightReport();
  const blueprint = validateRenderBlueprint();
  const registry = buildProviderRegistry();
  const accessMatrix = buildAccessMatrixRows();
  const evidenceRecords = collectEvidenceRecords();
  const graph = buildExtendedGoLiveGraph();
  const market35 = runMarket35Preflight();
  const security = evaluateFinalSecurityGate();
  const backup = getBackupRestoreEvidence();
  const flags = getProductionFlagsSnapshot();
  const sideEffects = getFinalGoLiveSafetyCounters();

  const market35Summary = {
    ready: market35.markets.filter((m) => m.status === "PASS").length,
    partial: market35.markets.filter((m) => m.status === "WARNING").length,
    blocked: market35.markets.filter((m) => m.status === "BLOCKED").length,
    humanRequired: market35.markets.filter((m) => m.warnings.some((w) => w.includes("SUPPLIER"))).length,
  };

  const scoreboard: BuzzardFinalStatusScoreboard = {
    SOFTWARE: preflight.softwareComplete ? "VALIDATED" : "BLOCKED",
    CONFIGURATION: preflight.configComplete ? "CONFIGURED" : "UNVERIFIED_EXTERNAL",
    PERSISTENCE: blueprint.BLUEPRINT_CONFIGURATION === "PASS" ? "CONFIGURED" : "HUMAN_REQUIRED",
    EXTERNAL_ACCESS: "HUMAN_REQUIRED",
    LIVE_VALIDATION: "BLOCKED",
    SECURITY: security.status === "PASS" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
    BACKUP: backup.result === "PASS" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
    SUPPLIER: registry.find((r) => r.name === "INTER CARS")?.liveValidationState ?? "NOT_CONFIGURED",
    PAYMENT: registry.find((r) => r.name === "PAYMENT")?.liveValidationState ?? "NOT_CONFIGURED",
    CARRIER: registry.find((r) => r.name === "CARRIER")?.liveValidationState ?? "NOT_CONFIGURED",
    RETURNS: registry.find((r) => r.name === "RETURNS")?.liveValidationState ?? "NOT_CONFIGURED",
    MARKETPLACE: "NOT_CONFIGURED",
    AI: registry.find((r) => r.name === "AI PROVIDER")?.liveValidationState ?? "NOT_CONFIGURED",
    MARKETING: registry.find((r) => r.name === "MARKETING")?.liveValidationState ?? "NOT_CONFIGURED",
    MARKETS_35: market35Summary.blocked === 0 ? "PARTIAL" : "PARTIAL",
    CUSTOMS: "UNVERIFIED_EXTERNAL",
    CHECKOUT: "CONFIGURED",
    HUMAN_APPROVAL: "HUMAN_REQUIRED",
    FIRST_ORDER: "BLOCKED_EXTERNAL_ACCESS",
    OBSERVATION: "BLOCKED_EXTERNAL_ACCESS",
    PRODUCTION: "BLOCKED",
    SALES: flags.SALES === "ON" ? "FAILED" : "DISABLED",
  };

  const blockers = [...new Set([...preflight.blockers, ...registry.flatMap((r) => r.blockers)])];
  const warnings = [...preflight.warnings];

  if (flags.SALES === "ON") {
    blockers.push("SALES_ENABLED_UNEXPECTEDLY_ON");
  }
  if (!isProductionKillSwitchActive() && isProductionFlagEnabled("SALES")) {
    blockers.push("KILL_SWITCH_SALES_MISMATCH");
  }

  const nextHumanActions = buildNextHumanActions(registry);

  return {
    generatedAt: new Date().toISOString(),
    masterStatus: {
      SOFTWARE_COMPLETE: preflight.softwareComplete,
      CONFIGURATION_COMPLETE: preflight.configComplete,
      EXTERNAL_ACCESS: "HUMAN_REQUIRED",
      LIVE_VALIDATION: "BLOCKED",
      PRODUCTION: "BLOCKED",
      GO_LIVE: "BLOCKED",
      SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
    },
    scoreboard,
    providerRegistry: registry,
    accessMatrix,
    evidenceRecords,
    goLiveDependencyGraph: graph,
    renderControl: {
      BLUEPRINT_CONFIGURATION: blueprint.BLUEPRINT_CONFIGURATION === "PASS" ? "VALIDATED" : "BLOCKED",
      LIVE_PERSISTENT_DISK: blueprint.LIVE_RENDER_DISK === "PASS" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
      LIVE_DEPLOYMENT: "HUMAN_REQUIRED",
      LIVE_HEALTH: blueprint.LIVE_RENDER_DISK === "PASS" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
    },
    market35Summary,
    nextHumanActions,
    blockers,
    warnings,
    sideEffectCounters: {
      realSupplierOrders: sideEffects.realSupplierOrders,
      realCustomerOrders: 0,
      realPayments: sideEffects.realPayments,
      realRefunds: sideEffects.realRefunds,
      realShipments: sideEffects.realCarrierLabels,
      realLabels: sideEffects.realCarrierLabels,
      realMarketplaceListings: 0,
      realMarketplaceOrders: sideEffects.realMarketplaceMutations,
      realAdSpend: sideEffects.realMarketingSpend,
      productionDeployments: 0,
      externalMutations: 0,
      fakeEvidence: countRejectedEvidenceAttempts(),
    },
    fakeProductionEvidence: countRejectedEvidenceAttempts(),
    auditSnapshot: [
      "ACCESS_STATUS_CHANGED:READ_ONLY",
      "EVIDENCE_REGISTERED:READ_ONLY",
      "HUMAN_ACTION_REQUIRED:ACTIVE",
      "GO_LIVE_BLOCKED:ACTIVE",
      "SALES_ENABLEMENT_BLOCKED:ACTIVE",
    ],
  };
}
