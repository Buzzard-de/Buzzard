import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";

export type RenderEvidenceSource =
  | "RENDER_LIVE"
  | "LOCAL"
  | "SANDBOX"
  | "BLUEPRINT"
  | "UNIT_TEST";

export type RenderEvidenceEnvironment = "PRODUCTION" | "CONTROLLED_VALIDATION" | "LOCAL" | "SANDBOX" | "MOCK";

export type RenderPersistenceEvidenceKind =
  | "RENDER_PERSISTENCE_HEALTH"
  | "RENDER_RESTART_PERSISTENCE"
  | "RENDER_BACKUP"
  | "RENDER_RESTORE";

export interface RenderPersistenceEvidence {
  id: string;
  kind: RenderPersistenceEvidenceKind;
  environment: RenderEvidenceEnvironment;
  source: RenderEvidenceSource;
  timestamp: string;
  endpoint?: string;
  dbPath?: string;
  persistent?: boolean;
  backupPath?: string;
  healthStatus?: string;
  restartVerified?: boolean;
  evidenceReference: string;
  payloadHash: string;
  operator?: string;
  expiresAt?: string;
  /** Restart persistence payload */
  restart?: {
    before?: string;
    after?: string;
    samePersistentPath?: boolean;
    databaseIntegrity?: string;
  };
  /** Backup payload */
  backup?: {
    backupPath: string;
    databasePath: string;
    success: boolean;
    artifactReference?: string;
  };
  /** Restore payload (metadata only) */
  restore?: {
    success: boolean;
    artifactReference?: string;
  };
}

export interface RenderPersistenceEvidenceInput {
  kind: RenderPersistenceEvidenceKind;
  environment: RenderEvidenceEnvironment;
  source: RenderEvidenceSource;
  timestamp: string;
  endpoint?: string;
  dbPath?: string;
  persistent?: boolean;
  backupPath?: string;
  healthStatus?: string;
  restartVerified?: boolean;
  evidenceReference: string;
  operator?: string;
  expiresAt?: string;
  restart?: RenderPersistenceEvidence["restart"];
  backup?: RenderPersistenceEvidence["backup"];
  restore?: RenderPersistenceEvidence["restore"];
}

export interface RenderPersistenceLiveStatus {
  BLUEPRINT_CONFIGURATION: ControlCenterStatus;
  LIVE_RENDER_DISK: ControlCenterStatus;
  LIVE_DB_PATH: ControlCenterStatus;
  LIVE_DB_HEALTH: ControlCenterStatus;
  LIVE_RESTART_PERSISTENCE: ControlCenterStatus;
  LIVE_BACKUP: ControlCenterStatus;
  LIVE_RESTORE: ControlCenterStatus;
  PERSISTENCE: ControlCenterStatus;
}

export interface RenderPersistenceLocalHints {
  localVarDataWritable: boolean;
  localRestartTest: ControlCenterStatus;
  localBackupScriptPresent: boolean;
  note: string;
}

export interface RenderPersistenceVerificationReport {
  generatedAt: string;
  live: RenderPersistenceLiveStatus;
  localHints: RenderPersistenceLocalHints;
  acceptedEvidenceCount: number;
  expiredEvidenceCount: number;
  rejectedEvidenceAttempts: number;
  nextHumanAction?: string;
  humanActionCount: number;
}
