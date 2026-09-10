import type { AiTask, QueueEntry, TaskPriority } from "./types";
import { comparePriority } from "./priority";
import {
  getTask,
  listQueueEntries,
  saveQueueEntry,
  saveTask,
} from "./taskRegistry";
import { emitOrchestratorEvent } from "./events";
import { recordAudit } from "./audit";

const queue: QueueEntry[] = [];
let paused = false;

function generateQueueEntryId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function enqueueTask(taskId: string, priority?: TaskPriority): { ok: boolean; entry?: QueueEntry; errorCode?: string } {
  const task = getTask(taskId);
  if (!task) return { ok: false, errorCode: "TASK_NOT_FOUND" };

  const existing = listQueueEntries().find(
    (e) => e.taskId === taskId && e.status === "PENDING"
  );
  if (existing) return { ok: true, entry: existing };

  const entry: QueueEntry = {
    queueEntryId: generateQueueEntryId(),
    taskId,
    priority: priority ?? task.priority,
    enqueuedAt: new Date().toISOString(),
    status: "PENDING",
  };
  queue.push(entry);
  saveQueueEntry(entry);

  task.status = "QUEUED";
  saveTask(task);

  emitOrchestratorEvent({
    type: "TASK_QUEUED",
    taskId,
    source: "taskQueue",
    correlationId: task.correlationId,
  });

  return { ok: true, entry };
}

export function dequeueTask(): AiTask | undefined {
  if (paused) return undefined;

  const pending = queue
    .filter((e) => e.status === "PENDING")
    .sort((a, b) => comparePriority(a.priority, b.priority));

  const entry = pending[0];
  if (!entry) return undefined;

  entry.status = "ACKNOWLEDGED";
  entry.acknowledgedAt = new Date().toISOString();
  saveQueueEntry(entry);

  const task = getTask(entry.taskId);
  if (task) {
    task.status = "READY";
    saveTask(task);
  }
  return task;
}

export function acknowledgeTask(taskId: string): boolean {
  const entry = queue.find((e) => e.taskId === taskId && e.status === "PENDING");
  if (!entry) return false;
  entry.status = "ACKNOWLEDGED";
  entry.acknowledgedAt = new Date().toISOString();
  saveQueueEntry(entry);
  return true;
}

export function completeQueuedTask(taskId: string): boolean {
  const entry = queue.find((e) => e.taskId === taskId);
  if (!entry) return false;
  entry.status = "COMPLETED";
  saveQueueEntry(entry);
  return true;
}

export function failQueuedTask(taskId: string): boolean {
  const entry = queue.find((e) => e.taskId === taskId);
  if (!entry) return false;
  entry.status = "FAILED";
  saveQueueEntry(entry);
  return true;
}

export function cancelQueuedTask(taskId: string): boolean {
  const entry = queue.find((e) => e.taskId === taskId);
  if (!entry) return false;
  entry.status = "CANCELLED";
  saveQueueEntry(entry);

  const task = getTask(taskId);
  if (task) {
    task.status = "CANCELLED";
    saveTask(task);
    emitOrchestratorEvent({
      type: "TASK_CANCELLED",
      taskId,
      source: "taskQueue",
      correlationId: task.correlationId,
    });
    recordAudit({
      actor: "SYSTEM",
      actorType: "SYSTEM",
      taskId,
      action: "TASK_CANCELLED",
      previousState: task.status,
      newState: "CANCELLED",
      correlationId: task.correlationId,
    });
  }
  return true;
}

export function pauseQueue(): void {
  paused = true;
}

export function resumeQueue(): void {
  paused = false;
}

export function isQueuePaused(): boolean {
  return paused;
}

export function getQueueDepth(): number {
  return queue.filter((e) => e.status === "PENDING").length;
}

export function clearTaskQueue(): void {
  queue.length = 0;
  paused = false;
}
