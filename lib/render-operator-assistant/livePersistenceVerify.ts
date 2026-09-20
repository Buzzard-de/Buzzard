import { evaluateHealthDbResponse, type HealthDbResponse } from "@/lib/render-persistence-evidence-bridge/healthDbEvaluation";
import { buildRenderPersistenceLiveStatus } from "@/lib/render-persistence-evidence-bridge/persistenceStatus";
import { validateRenderBlueprint } from "@/lib/production-storage-preflight/renderBlueprintValidation";
import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";

export type LiveCheckStatus = "PASS" | "FAIL" | "UNVERIFIED_EXTERNAL" | "BLOCKED";

export interface LivePersistenceVerifyResult {
  httpReachable: boolean;
  httpStatus: number | null;
  environment: string;
  evaluation: ReturnType<typeof evaluateHealthDbResponse>;
  live: {
    BLUEPRINT_CONFIGURATION: ControlCenterStatus;
    LIVE_RENDER_DISK: LiveCheckStatus;
    LIVE_DB_PATH: LiveCheckStatus;
    LIVE_DB_HEALTH: LiveCheckStatus;
    LIVE_RESTART_PERSISTENCE: LiveCheckStatus;
    LIVE_BACKUP: LiveCheckStatus;
    LIVE_RESTORE: LiveCheckStatus;
    PERSISTENCE: ControlCenterStatus;
  };
  blueprintNote: string;
  cursorHasRenderDashboardAccess: false;
  dashboardActionRequired: boolean;
}

function mapLive(status: ControlCenterStatus, healthCriteriaMet: boolean): LiveCheckStatus {
  if (status === "VALIDATED") return "PASS";
  if (healthCriteriaMet && status === "UNVERIFIED_EXTERNAL") {
    return "UNVERIFIED_EXTERNAL";
  }
  return status === "BLOCKED" ? "BLOCKED" : "UNVERIFIED_EXTERNAL";
}

export function evaluateLivePersistenceFromHealthBody(
  body: HealthDbResponse | null,
  httpStatus: number | null,
  httpReachable: boolean
): LivePersistenceVerifyResult {
  const blueprint = validateRenderBlueprint();
  const bridgeLive = buildRenderPersistenceLiveStatus();
  const evaluation = body ? evaluateHealthDbResponse(body) : evaluateHealthDbResponse({});

  const healthCriteriaMet = httpReachable && httpStatus !== null && httpStatus >= 200 && httpStatus < 300 && evaluation.meetsLivePersistenceCriteria;

  const diskPass: LiveCheckStatus = healthCriteriaMet ? "PASS" : "UNVERIFIED_EXTERNAL";
  const dbPathPass: LiveCheckStatus = healthCriteriaMet ? "PASS" : "UNVERIFIED_EXTERNAL";
  const dbHealthPass: LiveCheckStatus = healthCriteriaMet ? "PASS" : httpReachable ? "FAIL" : "UNVERIFIED_EXTERNAL";

  return {
    httpReachable,
    httpStatus,
    environment: process.env.NODE_ENV === "production" ? "production" : "operator-workstation",
    evaluation,
    live: {
      BLUEPRINT_CONFIGURATION: blueprint.BLUEPRINT_CONFIGURATION === "PASS" ? "VALIDATED" : "BLOCKED",
      LIVE_RENDER_DISK: diskPass,
      LIVE_DB_PATH: dbPathPass,
      LIVE_DB_HEALTH: dbHealthPass,
      LIVE_RESTART_PERSISTENCE: mapLive(bridgeLive.LIVE_RESTART_PERSISTENCE, false),
      LIVE_BACKUP: mapLive(bridgeLive.LIVE_BACKUP, false),
      LIVE_RESTORE: mapLive(bridgeLive.LIVE_RESTORE, false),
      PERSISTENCE: bridgeLive.PERSISTENCE,
    },
    blueprintNote: "RENDER BLUEPRINT ≠ LIVE RENDER — YAML disk block does not prove runtime mount",
    cursorHasRenderDashboardAccess: false,
    dashboardActionRequired: !healthCriteriaMet,
  };
}
