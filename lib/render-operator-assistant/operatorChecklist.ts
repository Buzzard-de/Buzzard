import { buildRenderPersistenceLiveStatus } from "@/lib/render-persistence-evidence-bridge/persistenceStatus";
import { validateRenderBlueprint } from "@/lib/production-storage-preflight/renderBlueprintValidation";
import { parseBuzzardApiFromRenderYaml } from "./parseRenderService";

export interface OperatorChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  currentStatus: string;
  evidence: string;
  blocker: string;
}

export function buildRenderOperatorChecklist(): OperatorChecklistItem[] {
  const blueprint = validateRenderBlueprint();
  const live = buildRenderPersistenceLiveStatus();
  const parsed = parseBuzzardApiFromRenderYaml();

  const serviceFound = parsed.serviceName === "buzzard-api" && parsed.renderYamlPresent;
  const blueprintDisk = blueprint.RENDER_BLUEPRINT_DISK_CONFIGURED === "PASS";

  return [
    {
      id: "service",
      label: "Render service found (buzzard-api in render.yaml)",
      checked: serviceFound,
      currentStatus: serviceFound ? "CONFIGURED" : "BLOCKED",
      evidence: "render.yaml",
      blocker: serviceFound ? "—" : "Missing buzzard-api service block",
    },
    {
      id: "disk_created",
      label: "Persistent Disk created in Render Dashboard",
      checked: live.LIVE_RENDER_DISK === "VALIDATED",
      currentStatus: live.LIVE_RENDER_DISK,
      evidence: live.LIVE_RENDER_DISK === "VALIDATED" ? "RENDER_LIVE health evidence" : "none",
      blocker: live.LIVE_RENDER_DISK === "VALIDATED" ? "—" : "RENDER DASHBOARD ACTION REQUIRED",
    },
    {
      id: "disk_size",
      label: "Disk size >= 1 GB",
      checked: blueprintDisk && (parsed.diskSizeGB ?? 0) >= 1,
      currentStatus: blueprintDisk ? `blueprint:${parsed.diskSizeGB}GB` : "UNVERIFIED_EXTERNAL",
      evidence: "render.yaml disk.sizeGB",
      blocker: blueprintDisk ? "—" : "Fix render.yaml or create disk in Dashboard",
    },
    {
      id: "mount_path",
      label: "Mount path = /var/data",
      checked: parsed.mountPath === "/var/data" && live.LIVE_RENDER_DISK === "VALIDATED",
      currentStatus: live.LIVE_RENDER_DISK,
      evidence: parsed.mountPath ?? "missing",
      blocker: live.LIVE_RENDER_DISK === "VALIDATED" ? "—" : "Operator mount + live health",
    },
    {
      id: "db_path_env",
      label: "BUZZARD_DB_PATH=/var/data/buzzard.db",
      checked: parsed.dbPathEnv === "/var/data/buzzard.db",
      currentStatus: parsed.dbPathEnv ?? "NOT_SET",
      evidence: "render.yaml env",
      blocker: parsed.dbPathEnv === "/var/data/buzzard.db" ? "—" : "Set env in Render Dashboard",
    },
    {
      id: "backup_dir_env",
      label: "BUZZARD_BACKUP_DIR=/var/data/backups",
      checked: parsed.backupDirEnv === "/var/data/backups",
      currentStatus: parsed.backupDirEnv ?? "NOT_SET",
      evidence: "render.yaml env",
      blocker: parsed.backupDirEnv === "/var/data/backups" ? "—" : "Set env in Render Dashboard",
    },
    {
      id: "deploy",
      label: "Deploy / redeploy performed by operator",
      checked: live.LIVE_DB_HEALTH === "VALIDATED",
      currentStatus: live.LIVE_DB_HEALTH,
      evidence: "GET /api/health/db",
      blocker: "RENDER DASHBOARD ACTION REQUIRED — Cursor cannot deploy",
    },
    {
      id: "health_db",
      label: "/api/health/db checked",
      checked: live.LIVE_DB_HEALTH === "VALIDATED",
      currentStatus: live.LIVE_DB_HEALTH,
      evidence: "verify-render-persistence / RENDER_LIVE evidence",
      blocker: live.LIVE_DB_HEALTH === "VALIDATED" ? "—" : "Run npm run verify:render-persistence after deploy",
    },
    {
      id: "persistent_true",
      label: "persistent=true",
      checked: live.LIVE_RENDER_DISK === "VALIDATED",
      currentStatus: live.LIVE_RENDER_DISK,
      evidence: "health/db JSON",
      blocker: "Live endpoint must report persistent=true",
    },
    {
      id: "path_var_data",
      label: "path=/var/data/buzzard.db",
      checked: live.LIVE_DB_PATH === "VALIDATED",
      currentStatus: live.LIVE_DB_PATH,
      evidence: "health/db JSON",
      blocker: "Ephemeral path until disk mounted",
    },
    {
      id: "restart",
      label: "Manual Render restart performed",
      checked: live.LIVE_RESTART_PERSISTENCE === "VALIDATED",
      currentStatus: live.LIVE_RESTART_PERSISTENCE,
      evidence: "RENDER_RESTART_PERSISTENCE evidence",
      blocker: "Operator restart + re-verify + register evidence",
    },
    {
      id: "restart_pass",
      label: "After restart: DB persistence still PASS",
      checked: live.LIVE_RESTART_PERSISTENCE === "VALIDATED",
      currentStatus: live.LIVE_RESTART_PERSISTENCE,
      evidence: "restart persistence evidence",
      blocker: "—",
    },
    {
      id: "backup",
      label: "Backup created (npm run backup:db on production shell)",
      checked: live.LIVE_BACKUP === "VALIDATED",
      currentStatus: live.LIVE_BACKUP,
      evidence: "RENDER_BACKUP evidence",
      blocker: "Operator runs backup on Render — Cursor will not fake",
    },
    {
      id: "backup_evidence",
      label: "Backup evidence registered",
      checked: live.LIVE_BACKUP === "VALIDATED",
      currentStatus: live.LIVE_BACKUP,
      evidence: "render-persistence evidence bridge",
      blocker: "Use evidence CLI after real backup",
    },
    {
      id: "restore",
      label: "Restore validation (dry-run / controlled only)",
      checked: live.LIVE_RESTORE === "VALIDATED",
      currentStatus: live.LIVE_RESTORE,
      evidence: "RENDER_RESTORE evidence",
      blocker: "Production restore requires BUZZARD_ALLOW_PRODUCTION_RESTORE=1",
    },
    {
      id: "gate",
      label: "Render persistence gate PASS",
      checked: live.PERSISTENCE === "VALIDATED",
      currentStatus: live.PERSISTENCE,
      evidence: "gate:render-persistence",
      blocker: live.PERSISTENCE === "VALIDATED" ? "—" : "Complete live evidence chain",
    },
  ];
}
