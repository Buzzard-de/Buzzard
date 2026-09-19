import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { validateRenderBlueprint } from "@/lib/production-storage-preflight/renderBlueprintValidation";
import { runRestartPersistenceTest } from "@/lib/production-storage-preflight/restartPersistenceTest";
import { validateVarDataMount } from "@/lib/production-storage-preflight/varDataValidation";
import fs from "fs";
import path from "path";
import { listRenderPersistenceEvidence } from "./evidenceStore";
import type { RenderPersistenceEvidence, RenderPersistenceLiveStatus, RenderPersistenceLocalHints } from "./types";

function mapBlueprint(blueprintPass: boolean): ControlCenterStatus {
  return blueprintPass ? "VALIDATED" : "BLOCKED";
}

function liveFromEvidence(
  kind: RenderPersistenceEvidence["kind"],
  predicate: (e: RenderPersistenceEvidence) => boolean,
): ControlCenterStatus {
  const active = listRenderPersistenceEvidence(false).filter((e) => e.kind === kind && e.source === "RENDER_LIVE");
  if (active.some(predicate)) return "VALIDATED";
  return "UNVERIFIED_EXTERNAL";
}

export function buildRenderPersistenceLiveStatus(): RenderPersistenceLiveStatus {
  const blueprint = validateRenderBlueprint();
  const blueprintOk = blueprint.BLUEPRINT_CONFIGURATION === "PASS";

  const healthEvidence = listRenderPersistenceEvidence(false).filter(
    (e) => e.kind === "RENDER_PERSISTENCE_HEALTH" && e.source === "RENDER_LIVE",
  );
  const healthValid = healthEvidence.some((e) => e.persistent === true && e.dbPath?.includes("/var/data/buzzard.db"));

  const LIVE_RENDER_DISK = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_DB_PATH = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_DB_HEALTH = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";

  const LIVE_RESTART_PERSISTENCE = liveFromEvidence(
    "RENDER_RESTART_PERSISTENCE",
    (e) => e.restart?.samePersistentPath === true && e.restart.databaseIntegrity === "ok",
  );

  const LIVE_BACKUP = liveFromEvidence(
    "RENDER_BACKUP",
    (e) => e.backup?.success === true && Boolean(e.backup.backupPath?.includes("/var/data/backups")),
  );

  const LIVE_RESTORE = liveFromEvidence("RENDER_RESTORE", (e) => e.restore?.success === true);

  let PERSISTENCE: ControlCenterStatus = "HUMAN_REQUIRED";
  if (!blueprintOk) {
    PERSISTENCE = "BLOCKED";
  } else if (
    LIVE_RENDER_DISK === "VALIDATED" &&
    LIVE_DB_PATH === "VALIDATED" &&
    LIVE_DB_HEALTH === "VALIDATED" &&
    LIVE_RESTART_PERSISTENCE === "VALIDATED" &&
    LIVE_BACKUP === "VALIDATED"
  ) {
    PERSISTENCE = "VALIDATED";
  } else if (blueprintOk) {
    PERSISTENCE = "HUMAN_REQUIRED";
  }

  return {
    BLUEPRINT_CONFIGURATION: mapBlueprint(blueprintOk),
    LIVE_RENDER_DISK,
    LIVE_DB_PATH,
    LIVE_DB_HEALTH,
    LIVE_RESTART_PERSISTENCE,
    LIVE_BACKUP,
    LIVE_RESTORE,
    PERSISTENCE,
  };
}

export function buildRenderPersistenceLocalHints(): RenderPersistenceLocalHints {
  const varData = validateVarDataMount();
  const restart = runRestartPersistenceTest();
  const backupScript = fs.existsSync(path.join(process.cwd(), "scripts/db-backup.mjs"));

  return {
    localVarDataWritable: varData.exists && varData.writable && varData.sqliteOpenable,
    localRestartTest: restart.status === "PASS" ? "PASS" : "WARNING",
    localBackupScriptPresent: backupScript,
    note: "Local hints never promote LIVE_* to VALIDATED",
  };
}
