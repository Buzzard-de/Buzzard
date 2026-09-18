export type PreflightStatus = "PASS" | "WARNING" | "BLOCKED" | "UNVERIFIED";

export type PersistenceMode = "PERSISTENT" | "EPHEMERAL" | "DEVELOPMENT";

export interface EnvVarCheck {
  name: string;
  configured: boolean;
  valueHint: string;
}

export interface VarDataCheck {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  writable: boolean;
  sqliteOpenable: boolean;
  status: PreflightStatus;
  notes: string;
}

export interface SqliteConfigCheck {
  databasePath: string;
  fileExists: boolean;
  walMode: string | null;
  journalMode: string | null;
  foreignKeys: boolean | null;
  busyTimeout: number | null;
  integrityCheck: string | null;
  schemaVersion: string | null;
  migrationReady: boolean;
  status: PreflightStatus;
}

export interface RestartPersistenceResult {
  status: PreflightStatus;
  testDbPath: string;
  writeOk: boolean;
  readOk: boolean;
  cleanupOk: boolean;
  notes: string;
}

export interface BackupRestorePreflight {
  backupScriptPresent: boolean;
  restoreScriptPresent: boolean;
  backupDir: string;
  backupDirExists: boolean;
  backupAvailable: boolean;
  restoreProcedureDocumented: boolean;
  restoreEvidence: PreflightStatus;
  integrityCheckSupported: boolean;
  status: PreflightStatus;
  notes: string;
}

export interface DeploymentConfigCheck {
  renderYamlPresent: boolean;
  persistentDiskInBlueprint: boolean;
  buzzardDbPathInBlueprint: boolean;
  backupDirInBlueprint: boolean;
  healthCheckConfigured: boolean;
  status: PreflightStatus;
  notes: string;
}

export interface ManualRenderAction {
  step: number;
  action: string;
  reason: string;
}

export interface ProductionStoragePreflightReport {
  generatedAt: string;
  softwarePersistenceSupport: PreflightStatus;
  persistenceConfiguration: PreflightStatus;
  renderPersistentDisk: PreflightStatus;
  livePersistenceValidation: PreflightStatus;
  productionReadyImpact: "NO" | "BLOCKED";
  salesEnabled: "0" | "1";
  persistenceMode: PersistenceMode;
  healthStatus: {
    PERSISTENCE_CONFIGURED: PreflightStatus;
    PERSISTENCE_PATH: string;
    PERSISTENCE_WRITABLE: PreflightStatus;
    SQLITE_READY: PreflightStatus;
    MIGRATION_READY: PreflightStatus;
    BACKUP_READY: PreflightStatus;
    RESTORE_EVIDENCE: PreflightStatus;
    RESTART_PERSISTENCE: PreflightStatus;
    RENDER_MANUAL_ACTION_REQUIRED: PreflightStatus;
  };
  environment: EnvVarCheck[];
  varData: VarDataCheck;
  sqlite: SqliteConfigCheck;
  restartPersistence: RestartPersistenceResult;
  backupRestore: BackupRestorePreflight;
  deployment: DeploymentConfigCheck;
  manualActions: ManualRenderAction[];
  productionFlags: Record<string, string>;
  sideEffectCounters: {
    realSupplierOrders: number;
    realPaymentTransactions: number;
    realRefunds: number;
    realShipments: number;
    realMarketplaceOrders: number;
    realMarketplaceListings: number;
    realAdSpend: number;
    fakeEvidence: number;
  };
  pass: string[];
  blocked: string[];
  unverified: string[];
}
