import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { countRejectedEvidenceAttempts } from "@/lib/final-closure/evidencePolicy";
import { checkEnvironmentVariables, resolvePersistenceMode, resolveEffectiveDbPath, isPersistenceConfigured } from "./environmentValidation";
import { validateVarDataMount } from "./varDataValidation";
import { checkSqliteConfiguration } from "./sqliteCheck";
import { runRestartPersistenceTest, getRenderRestartRequirement } from "./restartPersistenceTest";
import { checkBackupRestorePreflight } from "./backupRestorePreflight";
import { checkDeploymentConfiguration } from "./deploymentConfig";
import type { ManualRenderAction, PreflightStatus, ProductionStoragePreflightReport } from "./types";

function buildManualActions(varData: ReturnType<typeof validateVarDataMount>, deployment: ReturnType<typeof checkDeploymentConfiguration>): ManualRenderAction[] {
  const actions: ManualRenderAction[] = [];
  if (!varData.exists) {
    actions.push({
      step: 1,
      action: "Upgrade buzzard-api to Starter plan and add persistent disk mounted at /var/data (1 GB)",
      reason: "Render free tier filesystem is ephemeral — SQLite data lost on redeploy",
    });
    actions.push({
      step: 2,
      action: "Set BUZZARD_DB_PATH=/var/data/buzzard.db and BUZZARD_BACKUP_DIR=/var/data/backups in Render environment",
      reason: "Application uses BUZZARD_DB_PATH SSOT — do not duplicate with new env keys",
    });
    actions.push({
      step: 3,
      action: "Sync Render Blueprint (render.yaml) or apply manual disk configuration",
      reason: deployment.persistentDiskInBlueprint ? "Blueprint ready — dashboard sync pending" : "Blueprint incomplete",
    });
    actions.push({
      step: 4,
      action: "Deploy latest commit (manual deploy — do not auto-trigger from this preflight)",
      reason: "Disk mount requires redeploy",
    });
    actions.push({
      step: 5,
      action: "Verify: curl https://buzzard-api.onrender.com/api/health/db — expect path /var/data/buzzard.db, persistent=true",
      reason: "LIVE_PERSISTENCE_VALIDATION only possible on production instance",
    });
    actions.push({
      step: 6,
      action: "Run npm run backup:db on Render after first persistent deploy",
      reason: "Establish backup baseline on persistent disk",
    });
  } else {
    actions.push({
      step: 1,
      action: "Verify /api/health/db reports persistent=true after Render restart",
      reason: "MANUAL_RENDER_RESTART_REQUIRED for live validation",
    });
  }
  return actions;
}

export function buildProductionStoragePreflightReport(): ProductionStoragePreflightReport {
  const environment = checkEnvironmentVariables();
  const persistenceMode = resolvePersistenceMode();
  const effectivePath = resolveEffectiveDbPath();
  const varData = validateVarDataMount();
  const sqlite = checkSqliteConfiguration();
  const restartPersistence = runRestartPersistenceTest();
  const backupRestore = checkBackupRestorePreflight();
  const deployment = checkDeploymentConfiguration();
  const manualActions = buildManualActions(varData, deployment);

  const flags = getProductionFlagsSnapshot();
  const sideEffects = getFinalGoLiveSafetyCounters();

  const renderPersistentDisk: PreflightStatus = varData.status === "PASS" ? "PASS" : varData.exists ? "WARNING" : "BLOCKED";
  const livePersistenceValidation: PreflightStatus =
    process.env.NODE_ENV === "production" && varData.exists && persistenceMode === "PERSISTENT"
      ? "UNVERIFIED"
      : "UNVERIFIED";

  const softwarePersistenceSupport: PreflightStatus =
    deployment.renderYamlPresent && restartPersistence.status === "PASS" ? "PASS" : "WARNING";

  const persistenceConfiguration: PreflightStatus =
    deployment.buzzardDbPathInBlueprint && deployment.persistentDiskInBlueprint ? "PASS" : "WARNING";

  const restartNote = getRenderRestartRequirement(varData.exists, persistenceMode);

  const healthStatus = {
    PERSISTENCE_CONFIGURED: isPersistenceConfigured() || deployment.buzzardDbPathInBlueprint ? "PASS" as PreflightStatus : "BLOCKED",
    PERSISTENCE_PATH: effectivePath,
    PERSISTENCE_WRITABLE: varData.writable ? "PASS" as PreflightStatus : varData.exists ? "WARNING" : "BLOCKED",
    SQLITE_READY: sqlite.status,
    MIGRATION_READY: sqlite.migrationReady ? "PASS" as PreflightStatus : sqlite.fileExists ? "WARNING" : "UNVERIFIED",
    BACKUP_READY: backupRestore.status,
    RESTORE_EVIDENCE: backupRestore.restoreEvidence,
    RESTART_PERSISTENCE: restartPersistence.status,
    RENDER_MANUAL_ACTION_REQUIRED: varData.exists ? "UNVERIFIED" as PreflightStatus : "BLOCKED" as PreflightStatus,
  };

  const pass: string[] = [
    "SQLite path SSOT via server/lib/dbPaths.js (BUZZARD_DB_PATH)",
    "Startup validation in server/lib/dbStartup.js",
    "Integrity checks in server/lib/dbIntegrity.js",
    "Ephemeral→persistent one-time migration on first /var/data mount",
    "Backup script: scripts/db-backup.mjs",
    "Restore script: scripts/restore-db.mjs (production guard)",
    "Render Blueprint: render.yaml with /var/data disk",
    "Isolated restart persistence test (temp DB only)",
  ];

  const blocked: string[] = [];
  const unverified: string[] = [];

  if (!varData.exists) {
    blocked.push("RENDER_PERSISTENT_DISK — /var/data not mounted on this instance");
    blocked.push("BLOCKED_MANUAL_DEPLOYMENT — configure Render persistent disk");
  }
  if (persistenceMode === "EPHEMERAL" && process.env.NODE_ENV === "production") {
    blocked.push("PERSISTENCE_MODE=EPHEMERAL in production without /var/data");
  }
  if (livePersistenceValidation === "UNVERIFIED") {
    unverified.push("LIVE_PERSISTENCE_VALIDATION — requires production Render instance check");
  }
  if (backupRestore.restoreEvidence === "UNVERIFIED") {
    unverified.push("RESTORE_EVIDENCE — not verified on production Render");
  }
  if (restartNote) {
    unverified.push(restartNote);
  }

  const productionReadyImpact: "NO" | "BLOCKED" =
    renderPersistentDisk === "PASS" && livePersistenceValidation !== "UNVERIFIED" ? "NO" : "BLOCKED";

  return {
    generatedAt: new Date().toISOString(),
    softwarePersistenceSupport,
    persistenceConfiguration,
    renderPersistentDisk,
    livePersistenceValidation,
    productionReadyImpact: productionReadyImpact === "BLOCKED" ? "BLOCKED" : "NO",
    salesEnabled: flags.SALES === "ON" ? "1" : "0",
    persistenceMode,
    healthStatus,
    environment,
    varData,
    sqlite,
    restartPersistence,
    backupRestore,
    deployment,
    manualActions,
    productionFlags: {
      SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
      SUPPLIER_NETWORK_ENABLED: flags.SUPPLIER_NETWORK === "ON" ? "1" : "0",
      SUPPLIER_ORDER_NETWORK_ENABLED: flags.SUPPLIER_ORDER_NETWORK === "ON" ? "1" : "0",
      PAYMENT_PRODUCTION_ENABLED: flags.PAYMENT_PRODUCTION === "ON" ? "1" : "0",
      CARRIER_PRODUCTION_ENABLED: flags.CARRIER_PRODUCTION === "ON" ? "1" : "0",
      MARKETING_SPEND_ENABLED: flags.MARKETING_SPEND === "ON" ? "1" : "0",
      AI_PRODUCTION_ENABLED: flags.AI_PRODUCTION === "ON" ? "1" : "0",
    },
    sideEffectCounters: {
      realSupplierOrders: sideEffects.realSupplierOrders,
      realPaymentTransactions: sideEffects.realPayments,
      realRefunds: sideEffects.realRefunds,
      realShipments: sideEffects.realCarrierLabels,
      realMarketplaceOrders: sideEffects.realMarketplaceMutations,
      realMarketplaceListings: 0,
      realAdSpend: sideEffects.realMarketingSpend,
      fakeEvidence: countRejectedEvidenceAttempts(),
    },
    pass,
    blocked,
    unverified,
  };
}
