import { recordRejectedEvidenceAttempt } from "@/lib/production-access/evidencePolicy";
import type { RenderPersistenceEvidenceInput } from "./types";

const TARGET_DB = "/var/data/buzzard.db";
const TARGET_BACKUP = "/var/data/backups";
const TARGET_MOUNT = "/var/data";

export function assertRenderLiveEvidenceSource(input: RenderPersistenceEvidenceInput): void {
  if (input.source !== "RENDER_LIVE") {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:SOURCE_NOT_RENDER_LIVE");
  }
  if (input.environment !== "PRODUCTION" && input.environment !== "CONTROLLED_VALIDATION") {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:ENVIRONMENT_NOT_PRODUCTION");
  }
  if (!input.timestamp || !input.evidenceReference?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:MISSING_REFERENCE_OR_TIMESTAMP");
  }
  if (!input.operator?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:MISSING_OPERATOR");
  }
}

export function validateHealthEvidenceFields(input: RenderPersistenceEvidenceInput): void {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_PERSISTENCE_HEALTH") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  if (input.persistent !== true) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:PERSISTENT_NOT_TRUE");
  }
  if (!input.dbPath?.includes(TARGET_MOUNT) || !input.dbPath.includes("buzzard.db")) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:WRONG_DB_PATH");
  }
  if (!input.endpoint?.includes("/api/health/db")) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:ENDPOINT_NOT_HEALTH_DB");
  }
}

export function validateRestartEvidenceFields(input: RenderPersistenceEvidenceInput): void {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_RESTART_PERSISTENCE") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  const r = input.restart;
  if (!r?.before || !r.after || !r.databaseIntegrity) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTART_FIELDS_INCOMPLETE");
  }
  if (r.samePersistentPath !== true) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTART_PATH_NOT_SAME");
  }
  if (r.databaseIntegrity !== "ok") {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTART_INTEGRITY_NOT_OK");
  }
}

export function validateBackupEvidenceFields(input: RenderPersistenceEvidenceInput): void {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_BACKUP") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  const b = input.backup;
  if (!b?.success || !b.backupPath?.includes(TARGET_BACKUP) || !b.databasePath?.includes(TARGET_DB)) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:BACKUP_INVALID");
  }
  if (!b.artifactReference?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:BACKUP_MISSING_ARTIFACT_REF");
  }
}

export function validateRestoreEvidenceFields(input: RenderPersistenceEvidenceInput): void {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_RESTORE") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  if (!input.restore?.artifactReference?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTORE_MISSING_ARTIFACT_REF");
  }
}

export function validateRenderPersistenceEvidenceInput(input: RenderPersistenceEvidenceInput): void {
  switch (input.kind) {
    case "RENDER_PERSISTENCE_HEALTH":
      validateHealthEvidenceFields(input);
      break;
    case "RENDER_RESTART_PERSISTENCE":
      validateRestartEvidenceFields(input);
      break;
    case "RENDER_BACKUP":
      validateBackupEvidenceFields(input);
      break;
    case "RENDER_RESTORE":
      validateRestoreEvidenceFields(input);
      break;
    default:
      recordRejectedEvidenceAttempt();
      throw new Error("RENDER_EVIDENCE:UNKNOWN_KIND");
  }
}

export const RENDER_PERSISTENCE_TARGETS = {
  mount: TARGET_MOUNT,
  db: TARGET_DB,
  backup: TARGET_BACKUP,
} as const;
