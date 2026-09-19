import type { HumanActionItem } from "@/lib/external-access-control-center/types";
import { buildRenderPersistenceLiveStatus } from "./persistenceStatus";

export function buildRenderPersistenceHumanActions(): HumanActionItem[] {
  const live = buildRenderPersistenceLiveStatus();
  const actions: HumanActionItem[] = [];

  if (live.BLUEPRINT_CONFIGURATION === "VALIDATED" && live.LIVE_RENDER_DISK !== "VALIDATED") {
    actions.push({
      priority: 1,
      provider: "Render",
      action: "Create/mount Persistent Disk on buzzard-api — path /var/data, size ≥ 1 GB",
      why: "Production SQLite requires Render persistent volume",
      requiredEvidence: "RENDER_PERSISTENCE_HEALTH",
      verificationMethod: "Deploy, then GET /api/health/db → persistent=true, path /var/data/buzzard.db",
      blocking: true,
    });
    actions.push({
      priority: 2,
      provider: "Render",
      action: "Deploy buzzard-api after disk mount and env BUZZARD_DB_PATH / BUZZARD_BACKUP_DIR",
      why: "Blueprint env vars must apply to running service",
      requiredEvidence: "RENDER_PERSISTENCE_HEALTH",
      verificationMethod: "GET /api/health/db on production URL",
      blocking: true,
    });
  }

  if (live.LIVE_RENDER_DISK !== "VALIDATED") {
    actions.push({
      priority: 3,
      provider: "Render",
      action: "Verify /api/health/db (persistent=true, /var/data/buzzard.db) and register RENDER_LIVE evidence",
      why: "Control center only accepts explicit external evidence",
      requiredEvidence: "LIVE_HEALTH",
      verificationMethod: "Operator-run curl + evidence registration (no auto-fetch in CI)",
      blocking: true,
    });
  }

  if (live.LIVE_BACKUP !== "VALIDATED") {
    actions.push({
      priority: 4,
      provider: "Render",
      action: "Run npm run backup:db on production instance; store backup artifact reference",
      why: "Backup path /var/data/backups must be proven with RENDER_BACKUP evidence",
      requiredEvidence: "RENDER_BACKUP",
      verificationMethod: "Artifact reference + metadata hash (no DB file in git)",
      blocking: true,
    });
  }

  if (live.LIVE_RESTART_PERSISTENCE !== "VALIDATED") {
    actions.push({
      priority: 5,
      provider: "Render",
      action: "Manual production restart; re-check /api/health/db; register RENDER_RESTART_PERSISTENCE evidence",
      why: "Cursor cannot trigger production restart — operator must verify same DB path after restart",
      requiredEvidence: "RENDER_RESTART_PERSISTENCE",
      verificationMethod: "before/after health + integrity ok + samePersistentPath",
      blocking: true,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
