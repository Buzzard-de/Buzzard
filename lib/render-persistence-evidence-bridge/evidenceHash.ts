import { createHash } from "crypto";
import type { RenderPersistenceEvidenceInput } from "./types";

const FORBIDDEN_HASH_KEYS = ["secret", "token", "password", "apiKey", "authorization"];

/** Hash metadata only — never secrets or DB contents. */
export function hashRenderPersistenceEvidenceMetadata(input: RenderPersistenceEvidenceInput): string {
  const safe = {
    kind: input.kind,
    environment: input.environment,
    source: input.source,
    timestamp: input.timestamp,
    endpoint: input.endpoint,
    dbPath: input.dbPath,
    persistent: input.persistent,
    backupPath: input.backupPath,
    healthStatus: input.healthStatus,
    restartVerified: input.restartVerified,
    evidenceReference: input.evidenceReference,
    operator: input.operator,
    expiresAt: input.expiresAt,
    restart: input.restart,
    backup: input.backup
      ? {
          backupPath: input.backup.backupPath,
          databasePath: input.backup.databasePath,
          success: input.backup.success,
          artifactReference: input.backup.artifactReference,
        }
      : undefined,
    restore: input.restore
      ? { success: input.restore.success, artifactReference: input.restore.artifactReference }
      : undefined,
  };
  const json = JSON.stringify(safe);
  for (const k of FORBIDDEN_HASH_KEYS) {
    if (json.toLowerCase().includes(k)) {
      throw new Error("EVIDENCE_HASH_FORBIDDEN_FIELD");
    }
  }
  return createHash("sha256").update(json).digest("hex");
}
