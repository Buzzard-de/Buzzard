import { describe, it, expect, beforeEach } from "vitest";
import {
  seedAiWorkersFixtures,
  buildFixtureTask,
  executeWorker,
  cancelExecution,
  getExecution,
  getExecutionByIdempotency,
  validateWorkerInput,
  validateWorkerOutput,
  buildScopedWorkerContext,
  validateContextPermissions,
  validateNoSecretsInContext,
  rejectClientExecutionModification,
  validateWorkerIdentity,
  validateProviderIdentity,
  selectProvider,
  registerDefaultProviders,
  disableProvider,
  setProviderHealth,
  getWorkerContract,
  listWorkerContracts,
  getWorkerCapabilityProfile,
  hasPermission,
  runDeterministicValidation,
  isActionSafe,
  buildProposedAction,
  computeDeadline,
  isTimedOut,
  applyTimeout,
  getTelemetryMetrics,
  getWorkerAuditLog,
  getSystemHealthSummary,
  discoverAllCapabilities,
  MOCK_PROVIDER_ID,
  FIXTURE_PRODUCT,
  FIXTURE_SUPPLIER,
  FIXTURE_ORDER,
  FIXTURE_RETURN,
  FIXTURE_CUSTOMER,
  toOrchestratorRecommendation,
} from "./index";
import type { StructuredWorkerOutput } from "./types";

describe("AI Worker Execution Layer Foundation", () => {
  beforeEach(() => {
    seedAiWorkersFixtures();
  });

  describe("Worker Contract & Registry", () => {
    it("registers all 10 mock workers", () => {
      expect(listWorkerContracts().length).toBe(10);
    });

    it("exposes capabilities for each worker", () => {
      const caps = discoverAllCapabilities();
      expect(Object.keys(caps).length).toBe(10);
      expect(caps.PRODUCT_AI.supportedTaskTypes).toContain("PRODUCT_ANALYSIS");
    });

    it("validates canHandle for supported task types", () => {
      const worker = getWorkerContract("PRODUCT_AI")!;
      expect(worker.canHandle("PRODUCT_ANALYSIS")).toBe(true);
      expect(worker.canHandle("ORDER_ANALYSIS")).toBe(false);
    });
  });

  describe("Provider Registry & Selection", () => {
    it("registers MOCK_PROVIDER", () => {
      registerDefaultProviders();
      const selection = selectProvider({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      expect(selection.ok).toBe(true);
      expect(selection.providerId).toBe(MOCK_PROVIDER_ID);
    });

    it("rejects unhealthy provider", () => {
      setProviderHealth(MOCK_PROVIDER_ID, "UNHEALTHY");
      const selection = selectProvider({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      expect(selection.ok).toBe(false);
    });

    it("rejects disabled provider", () => {
      disableProvider(MOCK_PROVIDER_ID);
      const selection = selectProvider({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      expect(selection.ok).toBe(false);
    });
  });

  describe("Input Validation", () => {
    it("rejects unsupported task type", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "ORDER_ANALYSIS" });
      const result = validateWorkerInput({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(false);
    });

    it("rejects worker ID mismatch", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      const result = validateWorkerInput({ task, workerId: "SUPPLIER_AI" });
      expect(result.ok).toBe(false);
    });

    it("rejects secrets in context", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT, apiKey: "sk-secret" } as never,
      });
      const result = validateWorkerInput({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(false);
    });
  });

  describe("Context Isolation & Permissions", () => {
    it("scopes product AI context to allowed fields", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: {
          productId: FIXTURE_PRODUCT,
          supplierCost: 50,
          buzzardMargin: 20,
        } as never,
      });
      const { context, scope } = buildScopedWorkerContext(task, "PRODUCT_AI");
      expect(context.productId).toBe(FIXTURE_PRODUCT);
      expect((context as Record<string, unknown>).supplierCost).toBeUndefined();
      expect(scope).toContain("productId");
    });

    it("blocks financial fields for customer service AI", () => {
      const task = buildFixtureTask({
        workerId: "CUSTOMER_SERVICE_AI",
        taskType: "CUSTOMER_SERVICE",
        context: {
          customerId: FIXTURE_CUSTOMER,
          orderId: FIXTURE_ORDER,
          engineOutputs: { orderStatus: "SHIPPED", internalMargin: 15 },
        },
      });
      const check = validateContextPermissions("CUSTOMER_SERVICE_AI", task.context);
      expect(check.ok).toBe(false);
    });

    it("allows customer-safe fields for customer service AI", () => {
      const task = buildFixtureTask({
        workerId: "CUSTOMER_SERVICE_AI",
        taskType: "CUSTOMER_SERVICE",
        context: {
          customerId: FIXTURE_CUSTOMER,
          orderId: FIXTURE_ORDER,
          engineOutputs: { orderStatus: "SHIPPED", refundStatus: "NONE" },
        },
      });
      const result = executeWorker({ task, workerId: "CUSTOMER_SERVICE_AI" });
      expect(result.ok).toBe(true);
    });
  });

  describe("Output Validation", () => {
    it("rejects invalid confidence", () => {
      const output: StructuredWorkerOutput = {
        recommendation: {},
        confidence: 1.5,
        reasoningSummary: "test",
        requiredApproval: false,
        authorityRequired: "RECOMMEND",
        deterministicValidationRequired: true,
      };
      expect(validateWorkerOutput(output).ok).toBe(false);
    });

    it("rejects forbidden actions", () => {
      const output: StructuredWorkerOutput = {
        recommendation: {},
        confidence: 0.9,
        reasoningSummary: "test",
        requiredApproval: false,
        authorityRequired: "RECOMMEND",
        deterministicValidationRequired: true,
        action: buildProposedAction({
          actionType: "SET_AUTHORITATIVE_PRICE",
          entityType: "PRODUCT",
          entityId: "p1",
        }),
      };
      expect(validateWorkerOutput(output).ok).toBe(false);
    });

    it("rejects irreversible action without approval", () => {
      const output: StructuredWorkerOutput = {
        recommendation: {},
        confidence: 0.9,
        reasoningSummary: "test",
        requiredApproval: false,
        authorityRequired: "RECOMMEND",
        deterministicValidationRequired: true,
        action: buildProposedAction({
          actionType: "IRREVERSIBLE_PAYMENT",
          entityType: "ORDER",
          entityId: "o1",
          reversible: false,
          requiresApproval: false,
          category: "IRREVERSIBLE_ACTION",
        }),
      };
      expect(isActionSafe(output)).toBe(false);
    });
  });

  describe("Deterministic Validation", () => {
    it("rejects pricing AI setting authoritative price", () => {
      const result = runDeterministicValidation({
        workerId: "PRICING_AI",
        taskType: "PRICE_RECOMMENDATION",
        output: {
          recommendation: { setAuthoritativePrice: true },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: { productId: FIXTURE_PRODUCT },
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("rejects finance AI overwriting historical data", () => {
      const result = runDeterministicValidation({
        workerId: "FINANCE_AI",
        taskType: "FINANCIAL_RECONCILIATION",
        output: {
          recommendation: { overwriteHistorical: true },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "ANALYZE",
          deterministicValidationRequired: true,
        },
        context: { returnId: FIXTURE_RETURN },
      });
      expect(result.finalDecision).toBe("ESCALATE");
    });

    it("rejects returns AI inventing supplier recovery", () => {
      const result = runDeterministicValidation({
        workerId: "RETURNS_AI",
        taskType: "RETURN_ANALYSIS",
        output: {
          recommendation: { inventSupplierRecovery: true },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "ANALYZE",
          deterministicValidationRequired: true,
        },
        context: { returnId: FIXTURE_RETURN },
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("rejects supplier AI inventing stock", () => {
      const result = runDeterministicValidation({
        workerId: "SUPPLIER_AI",
        taskType: "SUPPLIER_SELECTION",
        output: {
          recommendation: { inventSupplierStock: true },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: {},
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("rejects order AI direct modification", () => {
      const result = runDeterministicValidation({
        workerId: "ORDER_AI",
        taskType: "ORDER_ANALYSIS",
        output: {
          recommendation: { modifyOrderDirectly: true },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "ANALYZE",
          deterministicValidationRequired: true,
        },
        context: { orderId: FIXTURE_ORDER },
      });
      expect(result.validationStatus).toBe("FAILED");
    });
  });

  describe("All 10 Mock Workers", () => {
    const workerTasks = [
      ["PRODUCT_AI", "PRODUCT_ANALYSIS"],
      ["SUPPLIER_AI", "SUPPLIER_SELECTION"],
      ["PRICING_AI", "PRICE_RECOMMENDATION"],
      ["INVENTORY_AI", "INVENTORY_ANALYSIS"],
      ["ORDER_AI", "ORDER_ANALYSIS"],
      ["MARKETPLACE_AI", "MARKETPLACE_LISTING_ANALYSIS"],
      ["CUSTOMS_AI", "CUSTOMS_ANALYSIS"],
      ["CUSTOMER_SERVICE_AI", "CUSTOMER_SERVICE"],
      ["RETURNS_AI", "RETURN_ANALYSIS"],
      ["FINANCE_AI", "FINANCIAL_RECONCILIATION"],
    ] as const;

    for (const [workerId, taskType] of workerTasks) {
      it(`executes ${workerId}`, () => {
        const contextByWorker: Record<string, Record<string, unknown>> = {
          PRODUCT_AI: { productId: FIXTURE_PRODUCT },
          SUPPLIER_AI: { productId: FIXTURE_PRODUCT, supplierId: FIXTURE_SUPPLIER },
          PRICING_AI: { productId: FIXTURE_PRODUCT },
          INVENTORY_AI: { productId: FIXTURE_PRODUCT },
          ORDER_AI: { orderId: FIXTURE_ORDER },
          MARKETPLACE_AI: { marketplaceId: "amazon_de", productId: FIXTURE_PRODUCT },
          CUSTOMS_AI: { orderId: FIXTURE_ORDER, productId: FIXTURE_PRODUCT },
          CUSTOMER_SERVICE_AI: { orderId: FIXTURE_ORDER, engineOutputs: { orderStatus: "SHIPPED" } },
          RETURNS_AI: { returnId: FIXTURE_RETURN, orderId: FIXTURE_ORDER },
          FINANCE_AI: { returnId: FIXTURE_RETURN, orderId: FIXTURE_ORDER },
        };
        const task = buildFixtureTask({
          workerId,
          taskType,
          context: contextByWorker[workerId] ?? {},
        });
        const result = executeWorker({ task, workerId });
        expect(result.ok).toBe(true);
        expect(result.execution?.status).toBe("COMPLETED");
      });
    }
  });

  describe("Security", () => {
    it("rejects worker impersonation", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      expect(validateWorkerIdentity("PRODUCT_AI", "SUPPLIER_AI")).toBe(false);
      const result = executeWorker({ task, workerId: "SUPPLIER_AI" });
      expect(result.ok).toBe(false);
    });

    it("rejects provider impersonation check", () => {
      expect(validateProviderIdentity(MOCK_PROVIDER_ID, "FAKE_PROVIDER")).toBe(false);
    });

    it("rejects client modification of server fields", () => {
      expect(rejectClientExecutionModification({ validationStatus: "PASSED" }).allowed).toBe(false);
    });

    it("rejects secrets in context validation", () => {
      expect(validateNoSecretsInContext({ apiKey: "secret" })).toBe(false);
    });

    it("enforces permission model least privilege", () => {
      expect(hasPermission("PRODUCT_AI", "READ_PRODUCT")).toBe(true);
      expect(hasPermission("PRODUCT_AI", "READ_FINANCIAL")).toBe(false);
    });
  });

  describe("Timeout & Cancellation", () => {
    it("detects timeout", () => {
      const startedAt = new Date(Date.now() - 60_000).toISOString();
      const record = {
        executionId: "exec_1",
        taskId: "task_1",
        workerId: "PRODUCT_AI" as const,
        workerVersion: "1.0.0",
        taskType: "PRODUCT_ANALYSIS" as const,
        status: "RUNNING" as const,
        startedAt,
        deadlineAt: computeDeadline(startedAt, 1000),
        inputSchemaVersion: "1.0.0",
        outputSchemaVersion: "1.0.0",
        providerId: MOCK_PROVIDER_ID,
        providerVersion: "1.0.0",
        contextScope: [],
        approvalRequired: false,
        escalationRequired: false,
        correlationId: "corr_1",
      };
      expect(isTimedOut(record)).toBe(true);
      const timed = applyTimeout(record);
      expect(timed.status).toBe("TIMED_OUT");
    });

    it("handles provider timeout simulation", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT, metadata: { simulateTimeout: true } },
      });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("PROVIDER_TIMEOUT");
    });

    it("cancels execution", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      const created = executeWorker({ task, workerId: "PRODUCT_AI" });
      const cancelled = cancelExecution(created.execution!.executionId);
      expect(cancelled.ok).toBe(false);
      expect(cancelled.errorCode).toBe("ALREADY_TERMINAL");
    });
  });

  describe("Idempotency", () => {
    it("returns same result for duplicate idempotency key", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        idempotencyKey: "idem-exec-1",
        context: { productId: FIXTURE_PRODUCT },
      });
      const first = executeWorker({ task, workerId: "PRODUCT_AI" });
      const second = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(first.execution?.executionId).toBe(second.execution?.executionId);
    });
  });

  describe("Approval Flow", () => {
    it("requires approval for high financial impact pricing", () => {
      const task = buildFixtureTask({
        workerId: "PRICING_AI",
        taskType: "PRICE_RECOMMENDATION",
        context: { productId: FIXTURE_PRODUCT, metadata: { requiresApproval: true } },
      });
      const result = executeWorker({ task, workerId: "PRICING_AI" });
      expect(result.ok).toBe(true);
      expect(result.errorCode).toBe("APPROVAL_REQUIRED");
      expect(result.execution?.status).toBe("WAITING_APPROVAL");
    });
  });

  describe("Telemetry & Audit", () => {
    it("records telemetry metrics", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      executeWorker({ task, workerId: "PRODUCT_AI" });
      const metrics = getTelemetryMetrics();
      expect(metrics.executionCount).toBeGreaterThan(0);
      expect(metrics.successCount).toBeGreaterThan(0);
    });

    it("records append-only audit trail", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      const audit = getWorkerAuditLog(result.execution?.executionId);
      expect(audit.some((e) => e.action === "EXECUTION_CREATED")).toBe(true);
      expect(audit.some((e) => e.action === "EXECUTION_COMPLETED")).toBe(true);
    });

    it("reports system health", () => {
      const health = getSystemHealthSummary();
      expect(Object.keys(health.workers).length).toBe(10);
      expect(health.providers[MOCK_PROVIDER_ID]).toBe("HEALTHY");
    });
  });

  describe("End-to-End Workflows", () => {
    it("FLOW A — Product analysis", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        entityType: "PRODUCT",
        entityId: FIXTURE_PRODUCT,
        context: { productId: FIXTURE_PRODUCT },
      });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(result.execution?.status).toBe("COMPLETED");
      expect(result.recommendation?.reasoningSummary).toBeTruthy();
    });

    it("FLOW B — Supplier recommendation", () => {
      const task = buildFixtureTask({
        workerId: "SUPPLIER_AI",
        taskType: "SUPPLIER_SELECTION",
        context: { productId: FIXTURE_PRODUCT, supplierId: FIXTURE_SUPPLIER },
      });
      const result = executeWorker({ task, workerId: "SUPPLIER_AI" });
      expect(result.execution?.deterministicValidation?.validationStatus).toBe("PASSED");
    });

    it("FLOW C — Pricing with validation", () => {
      const task = buildFixtureTask({
        workerId: "PRICING_AI",
        taskType: "PRICE_RECOMMENDATION",
        context: { productId: FIXTURE_PRODUCT },
      });
      const result = executeWorker({ task, workerId: "PRICING_AI" });
      expect(result.ok).toBe(true);
      const orch = toOrchestratorRecommendation(result.recommendation!);
      expect(orch.deterministicValidationRequired).toBe(true);
    });

    it("FLOW D — Return then Finance analysis", () => {
      const returnTask = buildFixtureTask({
        workerId: "RETURNS_AI",
        taskType: "RETURN_ANALYSIS",
        context: { returnId: FIXTURE_RETURN, orderId: FIXTURE_ORDER },
      });
      const returnResult = executeWorker({ task: returnTask, workerId: "RETURNS_AI" });
      expect(returnResult.ok).toBe(true);

      const financeTask = buildFixtureTask({
        workerId: "FINANCE_AI",
        taskType: "FINANCIAL_RECONCILIATION",
        context: { returnId: FIXTURE_RETURN, orderId: FIXTURE_ORDER },
      });
      const financeResult = executeWorker({ task: financeTask, workerId: "FINANCE_AI" });
      expect(financeResult.ok).toBe(true);
    });

    it("FLOW E — Customer service restricted context", () => {
      const task = buildFixtureTask({
        workerId: "CUSTOMER_SERVICE_AI",
        taskType: "CUSTOMER_SERVICE",
        context: {
          customerId: FIXTURE_CUSTOMER,
          orderId: FIXTURE_ORDER,
          engineOutputs: { orderStatus: "SHIPPED" },
        },
      });
      const result = executeWorker({ task, workerId: "CUSTOMER_SERVICE_AI" });
      expect(result.ok).toBe(true);
      expect(getWorkerCapabilityProfile("CUSTOMER_SERVICE_AI").requiredPermissions).toContain("CUSTOMER_SAFE_DATA");
    });

    it("FLOW F — Provider timeout failure", () => {
      const task = buildFixtureTask({
        workerId: "INVENTORY_AI",
        taskType: "INVENTORY_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT, metadata: { simulateTimeout: true } },
      });
      const result = executeWorker({ task, workerId: "INVENTORY_AI" });
      expect(result.ok).toBe(false);
      expect(result.execution?.status).toBe("FAILED");
    });
  });

  describe("Orchestrator Integration", () => {
    it("converts worker output to orchestrator recommendation", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "PRODUCT_ANALYSIS" });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      const orch = toOrchestratorRecommendation(result.recommendation!);
      expect(orch.confidence).toBeGreaterThan(0);
      expect(orch.reasoningSummary).toBeTruthy();
    });
  });
});
