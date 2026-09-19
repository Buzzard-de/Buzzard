import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { countRejectedEvidenceAttempts } from "@/lib/final-closure/evidencePolicy";
import { buildProductionStoragePreflightReport } from "./preflightReport";
import { buildRenderBlueprintValidation } from "./renderBlueprintValidation";
import type { PreflightStatus } from "./types";

export interface RenderPersistentDiskBlueprintReport {
  generatedAt: string;
  SOFTWARE_SUPPORT: PreflightStatus;
  BLUEPRINT_CONFIGURATION: PreflightStatus;
  DATABASE_CONFIGURATION: PreflightStatus;
  BACKUP_CONFIGURATION: PreflightStatus;
  LIVE_RENDER_DISK: PreflightStatus;
  LIVE_PERSISTENCE: PreflightStatus;
  MANUAL_RENDER_ACTION: PreflightStatus;
  PRODUCTION_READY: "NO" | "BLOCKED";
  SALES_ENABLED: "0" | "1";
  renderYamlStatus: PreflightStatus;
  blueprint: Awaited<ReturnType<typeof buildRenderBlueprintValidation>>;
  storagePreflight: ReturnType<typeof buildProductionStoragePreflightReport>;
  sections: {
    blueprint: { status: PreflightStatus; summary: string };
    database: { status: PreflightStatus; path: string };
    backup: { status: PreflightStatus; path: string };
    live: { status: PreflightStatus; summary: string };
    manualAction: { required: boolean; steps: string[] };
  };
  sideEffectCounters: ReturnType<typeof buildProductionStoragePreflightReport>["sideEffectCounters"];
  productionFlags: Record<string, string>;
  /** Maps operator safety vocabulary — no simulated external completion */
  externalClassification: {
    software: "COMPLETE" | "INCOMPLETE";
    renderDisk: "HUMAN_REQUIRED" | "UNVERIFIED_EXTERNAL" | "VALIDATED_EXTERNAL";
    globalExternalAccess: "BLOCKED_EXTERNAL_ACCESS" | "HUMAN_REQUIRED";
    liveValidation: "BLOCKED" | "UNVERIFIED_EXTERNAL";
  };
}

export async function buildRenderPersistentDiskBlueprintReport(): Promise<RenderPersistentDiskBlueprintReport> {
  const storagePreflight = buildProductionStoragePreflightReport();
  const blueprint = await buildRenderBlueprintValidation();
  const flags = getProductionFlagsSnapshot();
  const sideEffects = getFinalGoLiveSafetyCounters();

  const manualSteps = [
    "Sync Render Blueprint (render.yaml) in Render Dashboard for buzzard-api",
    "Confirm Starter plan + persistent disk buzzard-data at /var/data (1 GB)",
    "Confirm env BUZZARD_DB_PATH=/var/data/buzzard.db and BUZZARD_BACKUP_DIR=/var/data/backups",
    "Manual deploy buzzard-api (do not auto-trigger from repository preflight)",
    "Verify GET /api/health/db → persistent=true and path /var/data/buzzard.db",
    "Run backup baseline on Render after first persistent deploy",
  ];

  const manualRequired = blueprint.BLUEPRINT_CONFIGURATION === "PASS" && blueprint.LIVE_RENDER_DISK !== "PASS";

  return {
    generatedAt: new Date().toISOString(),
    SOFTWARE_SUPPORT: blueprint.SOFTWARE_SUPPORT,
    BLUEPRINT_CONFIGURATION: blueprint.BLUEPRINT_CONFIGURATION,
    DATABASE_CONFIGURATION: blueprint.DATABASE_CONFIGURATION,
    BACKUP_CONFIGURATION: blueprint.BACKUP_CONFIGURATION,
    LIVE_RENDER_DISK: blueprint.LIVE_RENDER_DISK,
    LIVE_PERSISTENCE: blueprint.LIVE_PERSISTENCE,
    MANUAL_RENDER_ACTION: manualRequired ? "BLOCKED" : blueprint.MANUAL_RENDER_ACTION,
    PRODUCTION_READY: blueprint.LIVE_RENDER_DISK === "PASS" ? "NO" : "BLOCKED",
    SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
    renderYamlStatus: blueprint.renderYamlStatus,
    blueprint,
    storagePreflight,
    sections: {
      blueprint: {
        status: blueprint.BLUEPRINT_CONFIGURATION,
        summary: blueprint.buzzardApiServiceFound
          ? `buzzard-api disk=${blueprint.diskName ?? "?"} mount=${blueprint.diskMountPath ?? "?"} sizeGB=${blueprint.diskSizeGB ?? "?"}`
          : "buzzard-api service not found in render.yaml",
      },
      database: {
        status: blueprint.DATABASE_CONFIGURATION,
        path: blueprint.RENDER_DB_PATH,
      },
      backup: {
        status: blueprint.BACKUP_CONFIGURATION,
        path: blueprint.RENDER_BACKUP_PATH,
      },
      live: {
        status: blueprint.LIVE_RENDER_DISK,
        summary: blueprint.liveHealthProbe.notes,
      },
      manualAction: {
        required: manualRequired,
        steps: manualRequired ? manualSteps : ["No manual action if live disk already verified"],
      },
    },
    sideEffectCounters: {
      ...storagePreflight.sideEffectCounters,
      fakeEvidence: countRejectedEvidenceAttempts(),
      realSupplierOrders: sideEffects.realSupplierOrders,
      realPaymentTransactions: sideEffects.realPayments,
      realRefunds: sideEffects.realRefunds,
      realShipments: sideEffects.realCarrierLabels,
      realMarketplaceOrders: sideEffects.realMarketplaceMutations,
      realMarketplaceListings: 0,
      realAdSpend: sideEffects.realMarketingSpend,
    },
    productionFlags: storagePreflight.productionFlags,
    externalClassification: {
      software:
        blueprint.SOFTWARE_SUPPORT === "PASS" && blueprint.BLUEPRINT_CONFIGURATION === "PASS"
          ? "COMPLETE"
          : "INCOMPLETE",
      renderDisk:
        blueprint.LIVE_RENDER_DISK === "PASS"
          ? "VALIDATED_EXTERNAL"
          : blueprint.BLUEPRINT_CONFIGURATION === "PASS"
            ? "HUMAN_REQUIRED"
            : "UNVERIFIED_EXTERNAL",
      globalExternalAccess: "BLOCKED_EXTERNAL_ACCESS",
      liveValidation: "BLOCKED",
    },
  };
}
