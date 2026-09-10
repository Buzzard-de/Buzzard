import { describe, it, expect, beforeEach } from "vitest";
import {
  seedOrchestratorFixtures,
  buildTaskInput,
  buildOrderAnalysisInput,
  buildReturnAnalysisInput,
  buildCustomerServiceInput,
  buildFinanceAnalysisInput,
  FIXTURE_CUSTOMER_A,
  FIXTURE_CUSTOMER_B,
  FIXTURE_PRODUCT_TIRE,
  createTask,
  executeTask,
  cancelTask,
  getTask,
  calculateTaskPriority,
  enqueueTask,
  dequeueTask,
  cancelQueuedTask,
  pauseQueue,
  resumeQueue,
  isQueuePaused,
  detectCircularDependency,
  areDependenciesSatisfied,
  validateWorkerAuthority,
  validateDeterministicRule,
  createApprovalRequest,
  resolveApproval,
  getTaskApprovalStatus,
  failTask,
  retryTask,
  isRetryable,
  classifyFailure,
  escalateTask,
  detectConflict,
  resolveConflict,
  disableWorker,
  enableWorker,
  setWorkerHealth,
  rejectClientTaskModification,
  canCustomerAccessTask,
  validateNoSecretsInContext,
  filterCustomerSafeContext,
  validateCustomerServiceTask,
  toCustomerSafeRecommendation,
  startWorkflow,
  executeReadyWorkflowSteps,
  cancelWorkflow,
  getWorkflowInstance,
  processWebhookEvent,
  getOrchestratorEvents,
  getAuditLog,
  getObservabilityMetrics,
  listTasksAdmin,
  inspectTask,
  getAdminOverview,
  registerMockWorkerHandler,
  ORDER_WORKFLOW,
} from "./index";

describe("AI Task Orchestrator Foundation", () => {
  beforeEach(() => {
    seedOrchestratorFixtures();
  });

  describe("Task Model & Creation", () => {
    it("creates product AI task", () => {
      const result = createTask(buildTaskInput());
      expect(result.ok).toBe(true);
      expect(result.task?.taskId).toMatch(/^BZ-AI-TASK-/);
      expect(result.task?.status).toBe("QUEUED");
    });

    it("creates supplier AI task", () => {
      const result = createTask(buildTaskInput({
        taskType: "SUPPLIER_SELECTION",
        workerId: "SUPPLIER_AI",
        context: { supplierId: "TEST_SUPPLIER_A", productId: FIXTURE_PRODUCT_TIRE },
      }));
      expect(result.ok).toBe(true);
      expect(result.task?.workerId).toBe("SUPPLIER_AI");
    });

    it("rejects idempotent duplicate task", () => {
      const input = { ...buildTaskInput(), idempotencyKey: "idem-001" };
      const first = createTask(input);
      const second = createTask(input);
      expect(first.task?.taskId).toBe(second.task?.taskId);
    });

    it("rejects secrets in context", () => {
      const result = createTask(buildTaskInput({
        context: { productId: FIXTURE_PRODUCT_TIRE, apiKey: "sk-secret" } as import("./types").TaskContext,
      }));
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("SECURITY_VIOLATION");
    });
  });

  describe("Worker Registry", () => {
    it("lists all 10 default workers", () => {
      const overview = getAdminOverview();
      expect(overview.workers.length).toBe(10);
    });

    it("disables and enables worker", () => {
      disableWorker("PRODUCT_AI");
      const result = createTask(buildTaskInput());
      expect(result.ok).toBe(false);
      enableWorker("PRODUCT_AI");
      const retry = createTask(buildTaskInput());
      expect(retry.ok).toBe(true);
    });

    it("fails execution when worker unhealthy", () => {
      const created = createTask(buildTaskInput());
      setWorkerHealth("PRODUCT_AI", "UNHEALTHY");
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(false);
    });
  });

  describe("Task Priority", () => {
    it("calculates CRITICAL priority for high impact", () => {
      const priority = calculateTaskPriority({
        customerImpact: 3,
        financialImpact: 3,
        complianceRisk: true,
        supplierFailure: true,
        returnRefundUrgency: true,
      });
      expect(priority).toBe("CRITICAL");
    });

    it("calculates BACKGROUND for minimal input", () => {
      expect(calculateTaskPriority({})).toBe("BACKGROUND");
    });
  });

  describe("Queue Lifecycle", () => {
    it("enqueues and dequeues tasks by priority", () => {
      createTask({ ...buildTaskInput(), priority: "LOW" });
      createTask({ ...buildTaskInput({ taskType: "ORDER_ANALYSIS", workerId: "ORDER_AI" }), priority: "CRITICAL" });
      const task = dequeueTask();
      expect(task?.priority).toBe("CRITICAL");
    });

    it("supports pause and resume", () => {
      createTask(buildTaskInput());
      pauseQueue();
      expect(isQueuePaused()).toBe(true);
      expect(dequeueTask()).toBeUndefined();
      resumeQueue();
      expect(dequeueTask()).toBeDefined();
    });

    it("cancels queued task", () => {
      const created = createTask(buildTaskInput());
      cancelQueuedTask(created.task!.taskId);
      expect(getTask(created.task!.taskId)?.status).toBe("CANCELLED");
    });
  });

  describe("Dependency Engine", () => {
    it("executes dependency chain in order", () => {
      const first = createTask(buildTaskInput({ taskType: "SUPPLIER_SELECTION", workerId: "SUPPLIER_AI" }));
      const second = createTask(buildTaskInput({
        taskType: "PRICE_RECOMMENDATION",
        workerId: "PRICING_AI",
        dependencies: [first.task!.taskId],
      }));

      expect(areDependenciesSatisfied(second.task!)).toBe(false);
      executeTask(first.task!.taskId);
      expect(areDependenciesSatisfied(getTask(second.task!.taskId)!)).toBe(true);
    });

    it("rejects circular dependency", () => {
      const a = createTask(buildTaskInput());
      const b = createTask(buildTaskInput({
        taskType: "PRICE_RECOMMENDATION",
        workerId: "PRICING_AI",
        dependencies: [a.task!.taskId],
      }));
      const cycle = detectCircularDependency(b.task!.taskId, [a.task!.taskId]);
      expect(cycle.circular).toBe(false);

      const bad = createTask(buildTaskInput({
        dependencies: [b.task!.taskId],
        idempotencyKey: "cycle-test",
      }));
      if (bad.ok) {
        const task = getTask(bad.task!.taskId)!;
        task.dependencies = [bad.task!.taskId];
        const result = detectCircularDependency(bad.task!.taskId, [bad.task!.taskId]);
        expect(result.circular).toBe(true);
      }
    });
  });

  describe("Authority & Deterministic Validation", () => {
    it("validates worker authority", () => {
      const task = createTask(buildTaskInput()).task!;
      expect(validateWorkerAuthority(task).ok).toBe(true);
    });

    it("rejects authority violation for disabled worker", () => {
      const created = createTask(buildTaskInput());
      disableWorker("PRODUCT_AI");
      const task = getTask(created.task!.taskId)!;
      expect(validateWorkerAuthority(task).ok).toBe(false);
    });

    it("rejects deterministic validation for negative price", () => {
      const task = createTask(buildTaskInput({
        taskType: "PRICE_RECOMMENDATION",
        workerId: "PRICING_AI",
      })).task!;

      registerMockWorkerHandler("PRICING_AI", ({ task: t }) => ({
        ok: true,
        recommendation: {
          recommendation: { price: -10 },
          confidence: 0.9,
          reasoningSummary: "Bad price",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
      }));

      const result = executeTask(task.taskId);
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("DETERMINISTIC_VALIDATION_FAILED");
    });

    it("rejects overwrite of historical financial data", () => {
      const task = createTask(buildFinanceAnalysisInput()).task!;
      registerMockWorkerHandler("FINANCE_AI", ({ task: t }) => ({
        ok: true,
        recommendation: {
          recommendation: { overwriteHistorical: true },
          confidence: 0.9,
          reasoningSummary: "Attempt overwrite",
          requiredApproval: false,
          authorityRequired: "ANALYZE",
          deterministicValidationRequired: true,
        },
      }));

      const result = executeTask(task.taskId);
      expect(result.ok).toBe(false);
      expect(getTask(task.taskId)?.escalationState).toBe("ESCALATED");
    });
  });

  describe("Mock Worker Execution", () => {
    it("executes product analysis", () => {
      const created = createTask(buildTaskInput());
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
      expect(result.task?.recommendation?.reasoningSummary).toBeTruthy();
    });

    it("executes order analysis", () => {
      const created = createTask(buildOrderAnalysisInput());
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
    });

    it("executes return analysis", () => {
      const created = createTask(buildReturnAnalysisInput());
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
    });

    it("executes marketplace analysis", () => {
      const created = createTask(buildTaskInput({
        taskType: "MARKETPLACE_LISTING_ANALYSIS",
        workerId: "MARKETPLACE_AI",
        context: { marketplaceId: "amazon_de", productId: FIXTURE_PRODUCT_TIRE },
      }));
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
    });

    it("executes customs analysis", () => {
      const created = createTask(buildTaskInput({
        taskType: "CUSTOMS_ANALYSIS",
        workerId: "CUSTOMS_AI",
        context: { orderId: "ord_1", productId: FIXTURE_PRODUCT_TIRE },
      }));
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
    });

    it("executes customer service task", () => {
      const created = createTask(buildCustomerServiceInput());
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
    });

    it("executes finance reconciliation analysis", () => {
      const created = createTask(buildFinanceAnalysisInput());
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
    });

    it("executes inventory anomaly detection", () => {
      const created = createTask(buildTaskInput({
        taskType: "INVENTORY_ANALYSIS",
        workerId: "INVENTORY_AI",
        context: { productId: FIXTURE_PRODUCT_TIRE, metadata: { forceAnomaly: true } },
      }));
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(true);
    });
  });

  describe("Retry & Failure", () => {
    it("retries transient failure", () => {
      const created = createTask(buildTaskInput({
        context: { productId: FIXTURE_PRODUCT_TIRE, metadata: { simulateTransientError: true } },
      }));
      executeTask(created.task!.taskId);
      expect(classifyFailure("TRANSIENT_ERROR")).toBe("TRANSIENT_FAILURE");
      expect(isRetryable("TRANSIENT_FAILURE")).toBe(true);

      const task = getTask(created.task!.taskId)!;
      task.retryable = true;
      task.failureType = "TRANSIENT_FAILURE";
      const retry = retryTask(task.taskId);
      expect(retry.ok).toBe(true);
    });

    it("does not retry permanent failure", () => {
      expect(isRetryable("PERMANENT_FAILURE")).toBe(false);
      expect(isRetryable("AUTHORITY_FAILURE")).toBe(false);
      expect(isRetryable("VALIDATION_FAILURE")).toBe(false);
    });

    it("handles worker timeout", () => {
      const created = createTask(buildTaskInput({
        context: { productId: FIXTURE_PRODUCT_TIRE, metadata: { simulateTimeout: true } },
      }));
      const result = executeTask(created.task!.taskId);
      expect(result.ok).toBe(false);
    });
  });

  describe("Escalation", () => {
    it("escalates critical failure", () => {
      const created = createTask(buildTaskInput());
      const escalation = escalateTask({
        taskId: created.task!.taskId,
        reason: "Pricing anomaly detected",
        severity: "HIGH",
      });
      expect(escalation?.state).toBe("ESCALATED");
      expect(getTask(created.task!.taskId)?.escalationState).toBe("ESCALATED");
    });
  });

  describe("Human Approval", () => {
    it("requires and resolves approval", () => {
      const created = createTask(buildTaskInput({
        taskType: "FINANCIAL_RECONCILIATION",
        workerId: "FINANCE_AI",
        context: {
          returnId: "ret_1",
          metadata: { requiresApproval: true, financialImpact: 1000 },
        },
      }));

      executeTask(created.task!.taskId);
      expect(getTaskApprovalStatus(created.task!.taskId)).toBe("PENDING");

      const approvals = inspectTask(created.task!.taskId).approvals;
      const resolved = resolveApproval(approvals[0].approvalId, "APPROVED", "admin@test");
      expect(resolved.ok).toBe(true);
    });
  });

  describe("Conflict Resolution", () => {
    it("detects conflicting recommendations", () => {
      const created = createTask(buildTaskInput());
      const conflict = detectConflict({
        taskId: created.task!.taskId,
        workers: ["SUPPLIER_AI", "INVENTORY_AI"],
        recommendations: [
          { workerId: "SUPPLIER_AI", recommendation: { supplier: "A" } },
          { workerId: "INVENTORY_AI", recommendation: { supplier: "B" } },
        ],
        conflictType: "SUPPLIER_MISMATCH",
        severity: "MEDIUM",
      });
      expect(conflict?.resolutionStatus).toBe("OPEN");

      const resolved = resolveConflict({
        conflictId: conflict!.conflictId,
        resolutionMethod: "HUMAN_APPROVAL",
        resolvedBy: "admin@test",
      });
      expect(resolved.ok).toBe(true);
    });
  });

  describe("Workflow", () => {
    it("starts and executes order workflow steps", () => {
      const started = startWorkflow({
        workflowId: ORDER_WORKFLOW.workflowId,
        entityType: "ORDER",
        entityId: "ord_wf_1",
        context: { orderId: "ord_wf_1", productId: FIXTURE_PRODUCT_TIRE },
      });
      expect(started.ok).toBe(true);
      expect(started.instance?.taskIds.length).toBe(5);

      executeTask(started.instance!.taskIds[0]);
      const result = executeReadyWorkflowSteps(started.instance!.workflowInstanceId);
      expect(result.executed.length).toBeGreaterThan(0);
    });

    it("cancels workflow", () => {
      const started = startWorkflow({
        workflowId: ORDER_WORKFLOW.workflowId,
        entityType: "ORDER",
        entityId: "ord_cancel",
      });
      cancelWorkflow(started.instance!.workflowInstanceId);
      const instance = getWorkflowInstance(started.instance!.workflowInstanceId);
      expect(instance?.status).toBe("CANCELLED");
    });
  });

  describe("Security & Customer Safety", () => {
    it("rejects client modification of server fields", () => {
      const result = rejectClientTaskModification({ status: "COMPLETED", buzzardMargin: 10 });
      expect(result.allowed).toBe(false);
    });

    it("enforces customer isolation", () => {
      const created = createTask(buildCustomerServiceInput(FIXTURE_CUSTOMER_A));
      expect(canCustomerAccessTask(created.task!, FIXTURE_CUSTOMER_B)).toBe(false);
      expect(canCustomerAccessTask(created.task!, FIXTURE_CUSTOMER_A)).toBe(true);
    });

    it("filters customer-safe context", () => {
      const safe = filterCustomerSafeContext({
        orderId: "ord_1",
        supplierCost: 50,
        buzzardMargin: 20,
        engineOutputs: { orderStatus: "SHIPPED", internalMargin: 15 },
      } as import("./types").TaskContext);
      expect(safe.orderId).toBe("ord_1");
      expect((safe as Record<string, unknown>).supplierCost).toBeUndefined();
      expect(safe.engineOutputs?.orderStatus).toBe("SHIPPED");
      expect(safe.engineOutputs?.internalMargin).toBeUndefined();
    });

    it("rejects internal data in customer service context", () => {
      const task = createTask(buildCustomerServiceInput()).task!;
      (task.context as Record<string, unknown>).buzzardMargin = 15;
      expect(validateCustomerServiceTask(task).ok).toBe(false);
    });

    it("validates no secrets in context", () => {
      expect(validateNoSecretsInContext({ productId: "p1" })).toBe(true);
      expect(validateNoSecretsInContext({ apiKey: "sk-test" })).toBe(false);
    });
  });

  describe("Events, Audit & Idempotency", () => {
    it("records append-only events", () => {
      const created = createTask(buildTaskInput());
      executeTask(created.task!.taskId);
      const events = getOrchestratorEvents(created.task!.taskId);
      expect(events.some((e) => e.type === "TASK_CREATED")).toBe(true);
      expect(events.some((e) => e.type === "TASK_COMPLETED")).toBe(true);
    });

    it("records audit trail", () => {
      const created = createTask(buildTaskInput());
      executeTask(created.task!.taskId);
      const audit = getAuditLog(created.task!.taskId);
      expect(audit.length).toBeGreaterThan(0);
    });

    it("deduplicates webhook events", () => {
      const first = processWebhookEvent({
        provider: "marketplace",
        eventId: "evt_1",
        eventType: "RETURN_IMPORTED",
        payloadHash: "abc123",
      });
      const second = processWebhookEvent({
        provider: "marketplace",
        eventId: "evt_1",
        eventType: "RETURN_IMPORTED",
        payloadHash: "abc123",
      });
      expect(first.duplicate).toBeUndefined();
      expect(second.duplicate).toBe(true);
    });
  });

  describe("Observability & Admin", () => {
    it("tracks metrics", () => {
      const created = createTask(buildTaskInput());
      executeTask(created.task!.taskId);
      const metrics = getObservabilityMetrics();
      expect(metrics.tasksCreated).toBeGreaterThan(0);
      expect(metrics.tasksCompleted).toBeGreaterThan(0);
    });

    it("provides admin overview", () => {
      createTask(buildTaskInput());
      const admin = getAdminOverview();
      expect(admin.tasks.length).toBeGreaterThan(0);
      expect(listTasksAdmin().length).toBeGreaterThan(0);
    });
  });

  describe("End-to-End Mock Workflow", () => {
    it("completes full analysis pipeline", () => {
      const supplier = createTask(buildTaskInput({
        taskType: "SUPPLIER_SELECTION",
        workerId: "SUPPLIER_AI",
        context: { supplierId: "TEST_SUPPLIER_A", productId: FIXTURE_PRODUCT_TIRE },
      }));
      executeTask(supplier.task!.taskId);

      const pricing = createTask(buildTaskInput({
        taskType: "PRICE_RECOMMENDATION",
        workerId: "PRICING_AI",
        dependencies: [supplier.task!.taskId],
        context: { productId: FIXTURE_PRODUCT_TIRE },
      }));
      executeTask(pricing.task!.taskId);

      const returns = createTask(buildReturnAnalysisInput());
      executeTask(returns.task!.taskId);

      expect(getTask(supplier.task!.taskId)?.status).toBe("COMPLETED");
      expect(getTask(pricing.task!.taskId)?.status).toBe("COMPLETED");
      expect(getTask(returns.task!.taskId)?.status).toBe("COMPLETED");
      expect(getTask(pricing.task!.taskId)?.deterministicValidation?.validationStatus).toBe("PASSED");
    });
  });
});
