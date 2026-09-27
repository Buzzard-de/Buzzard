import { randomUUID } from "node:crypto";
import { AuditService } from "./audit.js";
import { ExceptionService } from "./exceptions.js";
import { PolicyEngine } from "./policy.js";
import { now, type RuntimeStore } from "./storage.js";
import type { AiAgent, TaskRequest, TaskResult } from "./types.js";

export class Orchestrator {
  private readonly agents = new Map<string, AiAgent>();

  constructor(
    private readonly store: RuntimeStore,
    private readonly audit: AuditService,
    private readonly policy: PolicyEngine,
    private readonly exceptions: ExceptionService
  ) {}

  register(agent: AiAgent): void {
    this.agents.set(agent.id, agent);
  }

  async dispatch(
    input: Omit<TaskRequest, "taskId" | "retryCount">
  ): Promise<TaskResult> {
    const cached = this.store.idempotency.get(input.idempotencyKey);
    if (cached) {
      this.audit.write({
        correlationId: input.correlationId,
        actor: input.sourceAi,
        action: "IDEMPOTENCY_HIT",
        outcome: "REUSED",
        metadata: { key: input.idempotencyKey }
      });
      return cached as TaskResult;
    }

    const decision = this.policy.evaluate(input.action, input.authorizationScope);
    if (!decision.allowed && !decision.requiresApproval) {
      const result: TaskResult = {
        taskId: randomUUID(),
        correlationId: input.correlationId,
        status: "BLOCKED",
        errorCode: "NOT_AUTHORIZED",
        errorMessage: decision.reason
      };
      this.store.idempotency.set(input.idempotencyKey, result);
      return result;
    }

    if (decision.requiresApproval) {
      const sessionId = String(input.payload && typeof input.payload === "object" && "sessionId" in input.payload
        ? (input.payload as { sessionId: unknown }).sessionId
        : "");
      this.exceptions.approval({
        correlationId: input.correlationId,
        sessionId,
        action: input.action,
        reason: decision.reason
      });
      const result: TaskResult = {
        taskId: randomUUID(),
        correlationId: input.correlationId,
        status: "BLOCKED",
        errorCode: "HUMAN_APPROVAL_REQUIRED",
        errorMessage: decision.reason
      };
      this.store.idempotency.set(input.idempotencyKey, result);
      return result;
    }

    const agent = this.agents.get(input.targetAi);
    if (!agent) throw new Error(`AI_NOT_REGISTERED:${input.targetAi}`);

    const request: TaskRequest = { ...input, taskId: randomUUID(), retryCount: 0 };
    this.audit.write({
      correlationId: request.correlationId,
      actor: request.sourceAi,
      action: "TASK_DISPATCH",
      outcome: "RUNNING",
      metadata: { taskId: request.taskId, targetAi: request.targetAi, action: request.action }
    });

    const result = await this.withTimeout(agent.execute(request), request.timeoutMs);
    this.store.idempotency.set(input.idempotencyKey, result);

    this.audit.write({
      correlationId: request.correlationId,
      actor: agent.id,
      action: request.action,
      outcome: result.status,
      metadata: { taskId: request.taskId }
    });
    return result;
  }

  async parallel(
    inputs: Array<Omit<TaskRequest, "taskId" | "retryCount">>
  ): Promise<TaskResult[]> {
    return Promise.all(inputs.map(x => this.dispatch(x)));
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("TASK_TIMEOUT")), timeoutMs);
      promise.then(
        value => { clearTimeout(timer); resolve(value); },
        error => { clearTimeout(timer); reject(error); }
      );
    });
  }
}