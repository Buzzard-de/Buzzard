import type { ConflictRecord, ConflictResolutionMethod, WorkerId } from "./types";
import { getConflict, listConflicts, saveConflict } from "./taskRegistry";
import { emitOrchestratorEvent } from "./events";
import { recordAudit } from "./audit";

let conflictCounter = 0;

function generateConflictId(): string {
  conflictCounter += 1;
  return `BZ-AI-CONF-${String(conflictCounter).padStart(6, "0")}`;
}

export function detectConflict(input: {
  taskId: string;
  workers: WorkerId[];
  recommendations: Array<{ workerId: WorkerId; recommendation: unknown }>;
  conflictType: string;
  severity: ConflictRecord["severity"];
}): ConflictRecord | undefined {
  if (input.recommendations.length < 2) return undefined;

  const uniqueValues = new Set(
    input.recommendations.map((r) => JSON.stringify(r.recommendation))
  );
  if (uniqueValues.size <= 1) return undefined;

  const conflict: ConflictRecord = {
    conflictId: generateConflictId(),
    taskId: input.taskId,
    workers: input.workers,
    recommendations: input.recommendations,
    conflictType: input.conflictType,
    severity: input.severity,
    resolutionStatus: "OPEN",
    createdAt: new Date().toISOString(),
  };

  saveConflict(conflict);

  emitOrchestratorEvent({
    type: "CONFLICT_DETECTED",
    taskId: input.taskId,
    source: "conflictEngine",
    metadata: { conflictId: conflict.conflictId, conflictType: input.conflictType },
  });

  recordAudit({
    actor: "SYSTEM",
    actorType: "SYSTEM",
    taskId: input.taskId,
    action: "CONFLICT_DETECTED",
    newState: "OPEN",
    reason: input.conflictType,
  });

  return conflict;
}

export function resolveConflict(input: {
  conflictId: string;
  resolutionMethod: ConflictResolutionMethod;
  resolvedBy: string;
}): { ok: boolean; conflict?: ConflictRecord; errorCode?: string } {
  const conflict = getConflict(input.conflictId);
  if (!conflict) return { ok: false, errorCode: "CONFLICT_NOT_FOUND" };
  if (conflict.resolutionStatus === "RESOLVED") {
    return { ok: false, errorCode: "ALREADY_RESOLVED" };
  }

  conflict.resolutionStatus = "RESOLVED";
  conflict.resolutionMethod = input.resolutionMethod;
  conflict.resolvedBy = input.resolvedBy;
  conflict.resolvedAt = new Date().toISOString();
  saveConflict(conflict);

  emitOrchestratorEvent({
    type: "CONFLICT_RESOLVED",
    taskId: conflict.taskId,
    source: "conflictEngine",
    metadata: { conflictId: conflict.conflictId, resolutionMethod: input.resolutionMethod },
  });

  recordAudit({
    actor: input.resolvedBy,
    actorType: "ADMIN",
    taskId: conflict.taskId,
    action: "CONFLICT_RESOLVED",
    previousState: "OPEN",
    newState: "RESOLVED",
    reason: input.resolutionMethod,
  });

  return { ok: true, conflict };
}

export function listOpenConflicts(): ConflictRecord[] {
  return listConflicts().filter((c) => c.resolutionStatus === "OPEN");
}

export function resetConflictCounter(): void {
  conflictCounter = 0;
}
