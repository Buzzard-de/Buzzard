import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admission = require("../lib/controlCenterJobAdmission.js");

function memoryDeps() {
  const state = { tasks: [], approvals: [], jobs: [], calls: [] };
  let sequence = 0;
  const nextId = (prefix) => `${prefix}_${++sequence}`;

  const deps = {
    assertJobPayloadEgress(payload) {
      state.calls.push("egress");
      const blocked = JSON.stringify(payload).includes("https://blocked.example");
      return blocked ? { ok: false, code: "HOST_NOT_ALLOWLISTED" } : { ok: true };
    },
    assertJobSafe(job) {
      state.calls.push("safety");
      if (job.payload?.safetyProbe === true) return { ok: false, issues: [{ reason: "probe" }] };
      return { ok: true, issues: [] };
    },
    createAiTask(input) {
      state.calls.push("task");
      const task = {
        id: nextId("task"),
        title: input.title,
        status: "PENDING",
        payload: input.payload,
        createdBy: input.createdBy,
        permissionsRequired: input.permissionsRequired,
      };
      state.tasks.push(task);
      return task;
    },
    createApproval(input) {
      state.calls.push("approval");
      const task = state.tasks.find((row) => row.id === input.taskId);
      if (task) task.status = "WAITING_APPROVAL";
      const approval = {
        id: nextId("appr"),
        taskId: input.taskId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        status: "PENDING",
        riskLevel: input.riskLevel,
        metadata: input.metadata,
      };
      state.approvals.push(approval);
      return approval;
    },
    enqueueJob(input) {
      state.calls.push("enqueue");
      const job = {
        id: nextId("job"),
        jobType: input.jobType,
        status: "QUEUED",
        payload: input.payload,
        priority: input.priority,
        maxRetries: input.maxRetries,
        createdBy: input.createdBy,
      };
      state.jobs.push(job);
      return job;
    },
    rememberJob({ approvalId, jobId }) {
      const approval = state.approvals.find((row) => row.id === approvalId);
      approval.metadata = { ...approval.metadata, jobId };
    },
    updateTaskStatus(id, status, extra) {
      const task = state.tasks.find((row) => row.id === id);
      task.status = status;
      task.result = extra?.result || null;
      return task;
    },
  };

  return { state, deps };
}

function responseDouble() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe("control center job admission", () => {
  it("keeps system.configure on administrator and admin only", () => {
    expect(admission.roleCanConfigureJobs("administrator")).toBe(true);
    expect(admission.roleCanConfigureJobs("admin")).toBe(true);
    expect(admission.roleCanConfigureJobs("read_only")).toBe(false);
    expect(admission.roleCanConfigureJobs("staff")).toBe(false);
    expect(admission.roleCanConfigureJobs("catalog_manager")).toBe(false);
    expect(admission.roleCanConfigureJobs("ai_agent")).toBe(false);
    expect(admission.roleCanConfigureJobs(undefined)).toBe(false);
  });

  it("stops the request before admission when the facade denies it", () => {
    const denied = responseDouble();
    const unauthenticated = admission.enforceControlCenterJobAccess({
      req: {},
      res: denied,
      requireAuth(_req, res) {
        res.status(401).json({ success: false });
        return null;
      },
      requirePermission() {
        throw new Error("permission must not run before auth");
      },
    });
    expect(unauthenticated).toBe(false);
    expect(denied.statusCode).toBe(401);

    const forbidden = responseDouble();
    const unauthorized = admission.enforceControlCenterJobAccess({
      req: { adminUser: { role: "read_only" } },
      res: forbidden,
      requireAuth() {
        return { realm: "admin" };
      },
      requirePermission(_req, res, permission) {
        expect(permission).toBe("system.configure");
        res.status(403).json({ success: false });
        return false;
      },
    });
    expect(unauthorized).toBe(false);
    expect(forbidden.statusCode).toBe(403);
  });

  it("admits a known dry-run job as a pending approval and does not queue it", () => {
    const { state, deps } = memoryDeps();
    const result = admission.admitControlCenterJob({
      actor: "synthetic-admin@example.test",
      body: { jobType: "SYSTEM_HEALTH", priority: "LOW", payload: { probe: true } },
      deps,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(202);
    expect(result.job).toBeNull();
    expect(result.pendingApproval).toBe(true);
    expect(state.jobs).toEqual([]);
    expect(state.calls).not.toContain("enqueue");
    expect(state.tasks[0].status).toBe("WAITING_APPROVAL");
    expect(state.tasks[0].permissionsRequired).toEqual([]);
    expect(state.approvals[0].status).toBe("PENDING");
    expect(state.approvals[0].resourceType).toBe("background_job");
    expect(state.approvals[0].metadata.origin).toBe("control_center");
    expect(state.approvals[0].metadata.spec.payload.dryRun).toBe(true);
    expect(state.approvals[0].metadata.spec.payload.probe).toBe(true);
  });

  it("refuses unknown, manual, and smoke job types with no writes", () => {
    for (const jobType of ["manual", "part4_smoke_test", "DROP_TABLE", ""]) {
      const { state, deps } = memoryDeps();
      const result = admission.admitControlCenterJob({
        actor: "synthetic-admin@example.test",
        body: { jobType, payload: { probe: true } },
        deps,
      });
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.code).toBe(jobType === "" ? "JOB_TYPE_REQUIRED" : "JOB_TYPE_REJECTED");
      expect(state.tasks).toEqual([]);
      expect(state.approvals).toEqual([]);
      expect(state.jobs).toEqual([]);
    }
  });

  it("refuses live, payment, sales, egress, and forged approval markers", () => {
    const cases = [
      [{ jobType: "SYSTEM_HEALTH", payload: { dryRun: false } }, "DRY_RUN_REQUIRED"],
      [{ jobType: "SYSTEM_HEALTH", payload: { charge: true } }, "PAYLOAD_FIELD_REFUSED"],
      [{ jobType: "SYSTEM_HEALTH", payload: { enableSales: true } }, "PAYLOAD_FIELD_REFUSED"],
      [{ jobType: "SUPPLIER_SYNC", payload: { live: true } }, "PAYLOAD_FIELD_REFUSED"],
      [{ jobType: "SYSTEM_HEALTH", payload: { note: "https://evil.example/hook" } }, "EGRESS_URL_REFUSED"],
      [{ jobType: "SYSTEM_HEALTH", payload: { approvalId: "appr_forged" } }, "PAYLOAD_FIELD_REFUSED"],
      [{ jobType: "SYSTEM_HEALTH", payload: { origin: "control_center" } }, "PAYLOAD_FIELD_REFUSED"],
      [{ jobType: "SYSTEM_HEALTH", payload: { constructor: { admin: true } } }, "PAYLOAD_FIELD_REFUSED"],
      [{ jobType: "SYSTEM_HEALTH", maxRetries: 99 }, "RETRY_LIMIT_REJECTED"],
      [{ jobType: "SYSTEM_HEALTH", priority: "URGENT" }, "PRIORITY_REJECTED"],
    ];
    for (const [body, code] of cases) {
      const { state, deps } = memoryDeps();
      const result = admission.admitControlCenterJob({
        actor: "synthetic-admin@example.test",
        body,
        deps,
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe(code);
      expect(state.jobs).toEqual([]);
      expect(state.approvals).toEqual([]);
    }
  });

  it("does not write when the existing safety or egress gate refuses", () => {
    const safety = memoryDeps();
    const blockedSafety = admission.admitControlCenterJob({
      actor: "synthetic-admin@example.test",
      body: { jobType: "SYSTEM_HEALTH", payload: { safetyProbe: true } },
      deps: safety.deps,
    });
    expect(blockedSafety.code).toBe("JOB_SAFETY_BLOCKED");
    expect(safety.state.approvals).toEqual([]);

    const egress = memoryDeps();
    egress.deps.assertJobPayloadEgress = () => ({ ok: false, code: "HOST_NOT_ALLOWLISTED" });
    const blockedEgress = admission.admitControlCenterJob({
      actor: "synthetic-admin@example.test",
      body: { jobType: "SYSTEM_HEALTH", payload: { probe: true } },
      deps: egress.deps,
    });
    expect(blockedEgress.code).toBe("EGRESS_DENIED");
    expect(egress.state.tasks).toEqual([]);
  });

  it("queues only after the existing approval is approved, and only once", () => {
    const { state, deps } = memoryDeps();
    const admitted = admission.admitControlCenterJob({
      actor: "synthetic-admin@example.test",
      body: { jobType: "CATEGORY_READINESS", payload: { categoryId: "synthetic" } },
      deps,
    });
    const approval = state.approvals[0];
    const early = admission.releaseApprovedControlCenterJob({
      approval,
      actor: "synthetic-admin@example.test",
      deps,
    });
    expect(early.code).toBe("APPROVAL_REQUIRED");
    expect(state.jobs).toEqual([]);

    expect(admission.planApprovalDecision(approval, "reject").action).toBe("none");
    expect(admission.planApprovalDecision({ resourceType: "background_job", metadata: {} }, "approve").action).toBe("none");
    expect(admission.planApprovalDecision(approval, "approve").action).toBe("release_background_job");
    expect(admission.planApprovalDecision({ taskId: "task_ai", resourceType: "ai_task" }, "approve").action).toBe("resume_ai_task");
    approval.status = "APPROVED";

    const released = admission.releaseApprovedControlCenterJob({
      approval,
      actor: "synthetic-approver@example.test",
      deps,
    });
    expect(released.ok).toBe(true);
    expect(state.jobs).toHaveLength(1);
    expect(state.jobs[0].status).toBe("QUEUED");
    expect(state.jobs[0].payload.dryRun).toBe(true);
    expect(state.jobs[0].payload.origin).toBe("control_center");
    expect(state.jobs[0].payload.approvalId).toBe(admitted.approval.id);
    expect(state.jobs[0].payload.live).toBeUndefined();
    expect(state.tasks[0].status).toBe("COMPLETED");
    expect(state.tasks[0].result.executed).toBe(false);

    const second = admission.releaseApprovedControlCenterJob({
      approval,
      actor: "synthetic-approver@example.test",
      deps,
    });
    expect(second.duplicate).toBe(true);
    expect(state.jobs).toHaveLength(1);
  });

  it("blocks worker execution of a control-center job until its approval is approved", () => {
    const pending = admission.assertApprovedForExecution(
      { id: "job_1", payload: { origin: "control_center", dryRun: true, approvalId: "appr_1" } },
      () => ({ id: "appr_1", status: "PENDING", resourceType: "background_job" })
    );
    expect(pending.ok).toBe(false);
    expect(pending.code).toBe("APPROVAL_REQUIRED");

    const approved = admission.assertApprovedForExecution(
      {
        id: "job_1",
        jobType: "SYSTEM_HEALTH",
        payload: { origin: "control_center", dryRun: true, approvalId: "appr_1" },
      },
      () => ({
        id: "appr_1",
        status: "APPROVED",
        resourceType: "background_job",
        metadata: {
          origin: "control_center",
          jobId: "job_1",
          spec: { source: "control_center", jobType: "SYSTEM_HEALTH" },
        },
      })
    );
    expect(approved.ok).toBe(true);

    const forged = admission.assertApprovedForExecution(
      { id: "job_2", payload: { origin: "control_center", dryRun: false, approvalId: "appr_1" } },
      () => ({ id: "appr_1", status: "APPROVED", resourceType: "background_job" })
    );
    expect(forged.code).toBe("JOB_EXECUTION_REFUSED");

    const unbound = admission.assertApprovedForExecution(
      { id: "job_internal", jobType: "SYSTEM_HEALTH", payload: { dryRun: true } },
      () => {
        throw new Error("lookup must not run");
      }
    );
    expect(unbound).toEqual({ ok: false, code: "APPROVAL_REQUIRED" });
  });

  it("binds one approval to one source and one job type", () => {
    const { state, deps } = memoryDeps();
    for (const source of Object.values(admission.JOB_SOURCES)) {
      const admitted = admission.admitBackgroundJob({
        actor: "synthetic-admin@example.test",
        source,
        body: { jobType: "SYSTEM_HEALTH", payload: { probe: true } },
        deps,
      });
      expect(admitted.ok).toBe(true);
      expect(admitted.job).toBeNull();
      expect(admitted.approval.metadata.origin).toBe(source);
      expect(admitted.approval.metadata.spec.source).toBe(source);
      expect(admitted.approval.metadata.spec.jobType).toBe("SYSTEM_HEALTH");
    }
    expect(state.jobs).toEqual([]);
    expect(state.calls.filter((call) => call === "enqueue")).toEqual([]);

    const approval = {
      id: "appr_bound",
      status: "APPROVED",
      resourceType: "background_job",
      metadata: {
        origin: "automation",
        spec: { source: "automation", jobType: "SYSTEM_HEALTH" },
      },
    };
    const payload = { origin: "automation", dryRun: true, approvalId: "appr_bound" };
    expect(admission.evaluateRunnableInsert({
      jobType: "SYSTEM_HEALTH",
      payload,
      approval,
    }).ok).toBe(true);
    expect(admission.evaluateRunnableInsert({
      jobType: "PRODUCT_SYNC",
      payload,
      approval,
    }).code).toBe("APPROVAL_JOB_TYPE_MISMATCH");
    expect(admission.evaluateRunnableInsert({
      jobType: "SYSTEM_HEALTH",
      payload: { ...payload, origin: "scheduler" },
      approval,
    }).code).toBe("APPROVAL_SOURCE_MISMATCH");
    approval.metadata.jobId = "job_existing";
    expect(admission.evaluateRunnableInsert({
      jobType: "SYSTEM_HEALTH",
      payload,
      approval,
    }).code).toBe("APPROVAL_ALREADY_USED");
    expect(admission.admitBackgroundJob({
      actor: "synthetic-admin@example.test",
      source: "unknown",
      body: { jobType: "SYSTEM_HEALTH" },
      deps,
    }).code).toBe("JOB_SOURCE_REJECTED");
  });

  it("checks approval before egress and refuses a second job from the same approval", () => {
    let egressCalls = 0;
    const unapproved = admission.preHandlerDecision(
      { id: "job_1", jobType: "SYSTEM_HEALTH", payload: { destinationUrl: "https://evil.example" } },
      () => {
        throw new Error("lookup must not run");
      },
      () => {
        egressCalls += 1;
        return { ok: false, code: "HOST_NOT_ALLOWLISTED" };
      }
    );
    expect(unapproved.code).toBe("JOB_EXECUTION_REFUSED");
    expect(egressCalls).toBe(0);

    const approval = {
      id: "appr_1",
      status: "APPROVED",
      resourceType: "background_job",
      metadata: {
        origin: "pim_import",
        jobId: "job_1",
        spec: { source: "pim_import", jobType: "PRODUCT_IMPORT" },
      },
    };
    const denied = admission.preHandlerDecision(
      {
        id: "job_1",
        jobType: "PRODUCT_IMPORT",
        payload: { origin: "pim_import", dryRun: true, approvalId: "appr_1", webhookUrl: "https://api.openai.com/v1" },
      },
      () => approval,
      () => ({ ok: false, code: "HOST_NOT_ALLOWLISTED" })
    );
    expect(denied.code).toBe("JOB_EGRESS_DENIED");
    const otherJob = admission.preHandlerDecision(
      {
        id: "job_2",
        jobType: "PRODUCT_IMPORT",
        payload: { origin: "pim_import", dryRun: true, approvalId: "appr_1" },
      },
      () => approval,
      () => ({ ok: true })
    );
    expect(otherJob.code).toBe("APPROVAL_JOB_MISMATCH");
  });
});
