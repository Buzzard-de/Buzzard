import type { GoLiveControlStep } from "@/lib/external-access-control-center/types";
import { buildRenderPersistenceLiveStatus } from "./persistenceStatus";

export function buildRenderPersistenceGoLiveSteps(): GoLiveControlStep[] {
  const live = buildRenderPersistenceLiveStatus();

  const step = (id: string, label: string, status: GoLiveControlStep["status"], blockingReason?: string): GoLiveControlStep => ({
    id,
    label,
    status,
    blockingReason,
    requiredHumanApproval: status === "HUMAN_REQUIRED" || status === "UNVERIFIED_EXTERNAL",
  });

  return [
    step(
      "blueprint-configuration",
      "BLUEPRINT_CONFIGURATION",
      live.BLUEPRINT_CONFIGURATION === "VALIDATED" ? "CONFIGURED" : "BLOCKED",
    ),
    step(
      "render-persistent-disk",
      "RENDER_PERSISTENT_DISK",
      live.LIVE_RENDER_DISK === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
      live.LIVE_RENDER_DISK === "VALIDATED" ? undefined : "LIVE_DISK_EVIDENCE_REQUIRED",
    ),
    step(
      "live-db-health",
      "LIVE_DB_HEALTH",
      live.LIVE_DB_HEALTH === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
    ),
    step(
      "restart-persistence",
      "RESTART_PERSISTENCE",
      live.LIVE_RESTART_PERSISTENCE === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
    ),
    step(
      "backup",
      "BACKUP",
      live.LIVE_BACKUP === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
    ),
    step(
      "persistence-validated",
      "PERSISTENCE_VALIDATED",
      live.PERSISTENCE === "VALIDATED" ? "VALIDATED" : live.PERSISTENCE === "HUMAN_REQUIRED" ? "HUMAN_REQUIRED" : "BLOCKED",
      live.PERSISTENCE === "VALIDATED" ? undefined : "RENDER_LIVE_EVIDENCE_INCOMPLETE",
    ),
  ];
}
