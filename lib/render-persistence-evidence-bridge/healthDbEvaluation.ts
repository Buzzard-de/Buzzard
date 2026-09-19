import { RENDER_PERSISTENCE_TARGETS } from "./evidenceValidation";

/** Shape returned by GET /api/health/db (SSOT: server/lib/db getDatabaseHealth). */
export interface HealthDbResponse {
  success?: boolean;
  database?: {
    enabled?: boolean;
    path?: string;
    error?: string;
    persistence?: {
      persistent?: boolean;
      mode?: string;
      ephemeralRisk?: boolean;
      backupDir?: string;
      renderDisk?: boolean;
    };
  };
}

export interface HealthDbEvaluation {
  persistent: boolean | null;
  path: string | null;
  backupPath: string | null;
  integrityHint: string | null;
  meetsLivePersistenceCriteria: boolean;
  reasons: string[];
}

/**
 * Pure evaluation of a health/db JSON body — does not perform HTTP.
 * Does NOT promote LIVE status; use only when registering RENDER_LIVE evidence.
 */
export function evaluateHealthDbResponse(body: HealthDbResponse): HealthDbEvaluation {
  const reasons: string[] = [];
  const path = body.database?.path ?? null;
  const persistent = body.database?.persistence?.persistent ?? null;
  const backupPath = body.database?.persistence?.backupDir ?? null;
  const integrityHint = body.database?.error ? `error:${body.database.error}` : "unknown";

  if (persistent !== true) reasons.push("persistent_not_true");
  if (!path?.includes(RENDER_PERSISTENCE_TARGETS.mount) || !path.includes("buzzard.db")) {
    reasons.push("db_path_not_var_data");
  }
  if (backupPath && !backupPath.includes(RENDER_PERSISTENCE_TARGETS.backup)) {
    reasons.push("backup_path_not_var_data_backups");
  }

  const meetsLivePersistenceCriteria =
    persistent === true &&
    Boolean(path?.includes(RENDER_PERSISTENCE_TARGETS.mount) && path.includes("buzzard.db"));

  return {
    persistent,
    path,
    backupPath,
    integrityHint,
    meetsLivePersistenceCriteria,
    reasons,
  };
}
