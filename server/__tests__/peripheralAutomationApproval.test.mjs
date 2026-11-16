import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admission = require("../lib/controlCenterJobAdmission.js");

function memoryDeps() {
  const state = { approvals: [], ids: 0 };
  return {
    state,
    deps: {
      newId() {
        state.ids += 1;
        return `auto_${state.ids}`;
      },
      createApproval(input) {
        const approval = {
          id: `appr_${state.approvals.length + 1}`,
          taskId: input.taskId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          status: "PENDING",
          metadata: input.metadata,
        };
        state.approvals.push(approval);
        return approval;
      },
    },
  };
}

function approved(source, jobType, jobId, extra = {}) {
  return {
    id: "appr_ok",
    status: "APPROVED",
    resourceType: source,
    metadata: {
      origin: source,
      jobId,
      consumed: false,
      spec: { source, jobType, dryRun: true },
      ...extra,
    },
  };
}

describe("peripheral automation approval", () => {
  it("starts the worker only when the flag is exactly 1", () => {
    expect(admission.workerExplicitlyEnabled({})).toBe(false);
    expect(admission.workerExplicitlyEnabled({ BUZZARD_WORKER_ENABLED: "0" })).toBe(false);
    expect(admission.workerExplicitlyEnabled({ BUZZARD_WORKER_ENABLED: "true" })).toBe(false);
    expect(admission.workerExplicitlyEnabled({ BUZZARD_WORKER_ENABLED: undefined })).toBe(false);
    expect(admission.workerExplicitlyEnabled({ BUZZARD_WORKER_ENABLED: "1" })).toBe(true);
  });

  it("admits each peripheral source as a pending approval and does not create a runnable job", () => {
    for (const source of Object.values(admission.PERIPHERAL_AUTOMATION_SOURCES)) {
      const { state, deps } = memoryDeps();
      const result = admission.admitPeripheralAutomation({
        source,
        jobType: source === "pim_import" ? "PRODUCT_IMPORT" : "held",
        actor: "synthetic@example.test",
        subjectId: "synthetic-subject",
        deps,
      });
      expect(result.ok).toBe(true);
      expect(result.executed).toBe(false);
      expect(result.dryRun).toBe(true);
      expect(result.job).toBeNull();
      expect(result.approval.status).toBe("PENDING");
      expect(result.approval.taskId).toBeNull();
      expect(result.approval.metadata.spec.dryRun).toBe(true);
      expect(result.approval.metadata.jobId).toBe(result.jobId);
      expect(state.approvals).toHaveLength(1);
      expect(admission.planApprovalDecision(result.approval, "approve").action).toBe("none");
    }
  });

  it("binds one approval to one source, job type, and job id", () => {
    const approval = approved("price_stock", "price_stock_apply", "auto_1");
    expect(admission.assertPeripheralExecution({
      source: "price_stock",
      jobType: "price_stock_apply",
      jobId: "auto_1",
      approval,
    }).ok).toBe(true);
    expect(admission.assertPeripheralExecution({
      source: "price_stock",
      jobType: "price_stock_apply",
      jobId: "auto_2",
      approval,
    }).code).toBe("APPROVAL_JOB_MISMATCH");
    expect(admission.assertPeripheralExecution({
      source: "ai_center",
      jobType: "price_stock_apply",
      jobId: "auto_1",
      approval,
    }).code).toBe("APPROVAL_REQUIRED");
    expect(admission.assertPeripheralExecution({
      source: "price_stock",
      jobType: "other",
      jobId: "auto_1",
      approval,
    }).code).toBe("APPROVAL_JOB_TYPE_MISMATCH");
    approval.metadata.spec.dryRun = false;
    expect(admission.assertPeripheralExecution({
      source: "price_stock",
      jobType: "price_stock_apply",
      jobId: "auto_1",
      approval,
    }).code).toBe("JOB_EXECUTION_REFUSED");
    approval.metadata.spec.dryRun = true;
    approval.metadata.consumed = true;
    expect(admission.assertPeripheralExecution({
      source: "price_stock",
      jobType: "price_stock_apply",
      jobId: "auto_1",
      approval,
    }).code).toBe("APPROVAL_ALREADY_USED");
  });

  it("refuses legacy unapproved automation and the synchronous import pipeline", () => {
    expect(admission.assertPeripheralExecution({
      source: "order_automation",
      jobType: "payment",
      jobId: "legacy",
      approval: null,
    }).code).toBe("APPROVAL_REQUIRED");
    expect(admission.assertPeripheralExecution({
      source: "ai_center",
      jobType: "product_copy",
      jobId: "legacy",
      approval: { id: "old", status: "APPROVED", resourceType: "ai_center", metadata: {} },
    }).code).toBe("APPROVAL_SOURCE_MISMATCH");

    let lookups = 0;
    const blocked = admission.assertPipelineStart({
      getApproval() {
        lookups += 1;
        return null;
      },
    });
    expect(blocked.code).toBe("APPROVAL_REQUIRED");
    expect(lookups).toBe(0);

    const allowed = admission.assertPipelineStart({
      approval: approved("pim_import", "PRODUCT_IMPORT", "auto_pim"),
    });
    expect(allowed.ok).toBe(true);
    expect(allowed.dryRun).toBe(true);
  });
});
