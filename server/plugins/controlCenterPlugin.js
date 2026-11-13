const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry");

function coreApi() {
  return require("../lib/controlCenter");
}

function sharedFacade() {
  return require("./orchestrationFacadePlugin").facade;
}

function attachAdmin(req, res) {
  if (req.adminUser && req.adminUser.role) return req.adminUser;
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: null,
    name: session.name,
    role: session.role,
  };
  return session;
}

function requirePerm(req, res, permission) {
  return requirePermission(req, res, permission);
}

function closedBody(extra) {
  return {
    success: false,
    salesOpen: false,
    egressAllowed: false,
    productionReady: false,
    executed: false,
    purchased: false,
    moneyMoved: false,
    refunded: false,
    shipmentCreated: false,
    orderChanged: false,
    ...extra,
  };
}

async function facadeDisabled(facade) {
  const probe = await facade.dispatch({ action: "" });
  return probe.status === "DISABLED" || probe.errorCode === "ORCHESTRATION_FACADE_DISABLED";
}

function sendDisabled(res) {
  res.status(503).json(closedBody({
    status: "DISABLED",
    errorCode: "ORCHESTRATION_FACADE_DISABLED",
  }));
}

function projectTask(body, result) {
  return {
    id: result.taskId,
    title: body.title || "admin task",
    description: body.description || "",
    employeeId: result.assigneeId || null,
    priority: body.priority || "NORMAL",
    status: result.status,
    permissionsRequired: Array.isArray(body.permissionsRequired) ? body.permissionsRequired : [],
    payload: {},
    result: null,
    error: null,
    retryCount: 0,
    maxRetries: 0,
    createdAt: new Date().toISOString(),
  };
}

function projectApproval(result, body, decision) {
  const item = result.item || {};
  const rawStatus = decision || item.status || result.status;
  const status = rawStatus === "WAITING_APPROVAL" ? "PENDING" : rawStatus;
  return {
    id: result.approvalId || item.id || null,
    taskId: result.taskId || item.task_id || null,
    resourceType: body.resourceType || "orchestration_facade",
    resourceId: result.humanRequiredAction || body.resourceId || null,
    aiRecommendation: body.aiRecommendation || "",
    reason: body.reason || item.reason || "",
    riskLevel: result.risk || item.risk || "CRITICAL",
    status,
    decidedBy: status === "APPROVED" || status === "REJECTED" ? "operator" : null,
    createdAt: item.created_at || new Date().toISOString(),
  };
}

function createControlCenterHandlers({ facade, readers } = {}) {
  const api = facade || sharedFacade();
  function records() {
    return readers || coreApi();
  }

  async function postTask(req, res) {
    if (!attachAdmin(req, res)) return;
    if (!requirePerm(req, res, "ai.assign")) return;
    if (await facadeDisabled(api)) return sendDisabled(res);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (!SEED_IDS.includes(body.employeeId)) {
      res.status(400).json(closedBody({ errorCode: "UNKNOWN_AGENT", status: "FAILED" }));
      return;
    }
    const result = await api.dispatch({
      action: "ASSIGN_TASK",
      fromId: "pusat",
      assigneeId: body.employeeId,
      title: body.title || "admin task",
    });
    if (result.status === "DISABLED") return sendDisabled(res);
    if (result.status !== "ASSIGNED") {
      res.status(400).json(closedBody({ errorCode: result.errorCode || "ASSIGN_TASK_DENIED", status: "FAILED" }));
      return;
    }
    const task = projectTask(body, result);
    logAuditFromRequest(req, {
      action: "ai.task.create",
      entityType: "ai_task",
      entityId: task.id,
      newValue: task.status,
    });
    res.status(201).json({ success: true, task });
  }

  async function patchTaskStatus(req, res) {
    if (!attachAdmin(req, res)) return;
    if (!requirePerm(req, res, "ai.execute")) return;
    if (await facadeDisabled(api)) return sendDisabled(res);
    res.status(409).json(closedBody({
      errorCode: "HUMAN_GATE_REQUIRED",
      status: "FAILED",
      taskId: req.params?.id || null,
    }));
  }

  async function postApproval(req, res) {
    if (!attachAdmin(req, res)) return;
    if (!requirePerm(req, res, "ai.assign")) return;
    if (await facadeDisabled(api)) return sendDisabled(res);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const action = body.action || body.resourceType;
    const result = await api.dispatch({
      action,
      agentId: "pusat",
      idempotencyKey: body.idempotencyKey,
      payload: {},
    });
    if (result.status === "DISABLED") return sendDisabled(res);
    if (result.status !== "WAITING_APPROVAL") {
      const code = result.errorCode || "NOT_IMPLEMENTED";
      res.status(code === "NOT_IMPLEMENTED" ? 501 : 400).json(closedBody({
        errorCode: code,
        status: result.status || "FAILED",
        auto: false,
      }));
      return;
    }
    const approval = projectApproval(result, body, "PENDING");
    logAuditFromRequest(req, {
      action: "approval.create",
      entityType: "approval",
      entityId: approval.id,
      newValue: "PENDING",
    });
    res.status(result.replay ? 200 : 201).json({ success: true, approval });
  }

  async function decideApproval(req, res) {
    if (!attachAdmin(req, res)) return;
    if (!requirePerm(req, res, "ai.execute")) return;
    if (await facadeDisabled(api)) return sendDisabled(res);
    const approved = req.body?.decision === "approve";
    const result = await api.decideHumanApproval({
      id: req.params?.id,
      approved,
      actorId: "operator",
    });
    if (result.status === "DISABLED" || result.errorCode === "ORCHESTRATION_FACADE_DISABLED") return sendDisabled(res);
    if (!result.ok) {
      res.status(result.errorCode === "NOT_FOUND" ? 404 : 400).json(closedBody({
        errorCode: result.errorCode || "PERMISSION_DENIED",
        status: "FAILED",
      }));
      return;
    }
    const approval = projectApproval(result, req.body || {}, result.item?.status || result.status);
    logAuditFromRequest(req, {
      action: approved ? "approval.approve" : "approval.reject",
      entityType: "approval",
      entityId: approval.id,
      newValue: approval.status,
    });
    res.json({ success: true, approval });
  }

  function register(app) {
    app.get("/api/health/db", (_req, res) => {
      const { getDatabaseHealth } = require("../lib/db");
      res.json({ success: true, database: getDatabaseHealth() });
    });

    app.get("/api/health/ai", async (_req, res) => {
      const { getOrchestratorStatus } = require("../lib/orchestratorBridge");
      const { getGuardianStatus } = require("../lib/guardianBridge");
      const orchestrator = await getOrchestratorStatus();
      const guardian = await getGuardianStatus();
      res.json({ success: true, orchestrator, guardian });
    });

    app.get("/api/categories/visibility", (_req, res) => {
      res.json({ success: true, visibility: coreApi().categoryVisibility.listAllStatuses() });
    });

    app.get("/api/admin/control-center/status", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, ...(await coreApi().getSystemStatus()) });
    });

    app.get("/api/admin/control-center/summary", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, summary: coreApi().getDashboardSummary() });
    });

    app.get("/api/admin/control-center/activity", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "audit.read")) return;
      res.json({ success: true, activity: coreApi().listActivity(Number(req.query.limit) || 50) });
    });

    app.get("/api/admin/control-center/search", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, results: coreApi().globalSearch(req.query.q) });
    });

    app.get("/api/admin/control-center/security", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "security.read")) return;
      res.json({ success: true, ...coreApi().getSecurityCenterSummary() });
    });

    app.get("/api/admin/control-center/config", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, config: coreApi().getPublicConfig() });
    });

    app.put("/api/admin/control-center/config/:key", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      try {
        const result = coreApi().setConfig(req.params.key, req.body?.value, req.adminUser.email);
        logAuditFromRequest(req, {
          action: "system.config.change",
          entityType: "config",
          entityId: req.params.key,
          newValue: req.body?.status,
        });
        res.json({ success: true, config: result });
      } catch (error) {
        res.status(400).json({ success: false, errorKey: "core.config.forbidden", message: error.message });
      }
    });

    app.get("/api/admin/ai/employees", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.read")) return;
      res.json({ success: true, employees: coreApi().listAiEmployees() });
    });

    app.patch("/api/admin/ai/employees/:id/status", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.assign")) return;
      let employee;
      try {
        employee = coreApi().updateAiEmployeeStatus(req.params.id, req.body?.status);
      } catch (error) {
        if (error.code !== "AI_EMPLOYEE_STATUS_INVALID") throw error;
        res.status(400).json({
          success: false,
          errorCode: "AI_EMPLOYEE_STATUS_INVALID",
          errorKey: "ai.employee.statusInvalid",
        });
        return;
      }
      if (!employee) return res.status(404).json({ success: false, errorKey: "ai.employee.notFound" });
      logAuditFromRequest(req, {
        action: "ai.employee.status",
        entityType: "ai_employee",
        entityId: req.params.id,
        newValue: req.body?.status,
      });
      res.json({ success: true, employee });
    });

    app.get("/api/admin/ai/tasks", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.read")) return;
      res.json({
        success: true,
        tasks: records().listAiTasks({
          status: req.query.status,
          employeeId: req.query.employeeId,
          limit: Number(req.query.limit) || 100,
        }),
      });
    });

    app.post("/api/admin/ai/tasks", (req, res) => {
      Promise.resolve(postTask(req, res)).catch(() => {
        if (!res.headersSent) res.status(500).json(closedBody({ errorCode: "INTERNAL_ERROR" }));
      });
    });

    app.patch("/api/admin/ai/tasks/:id/status", (req, res) => {
      Promise.resolve(patchTaskStatus(req, res)).catch(() => {
        if (!res.headersSent) res.status(500).json(closedBody({ errorCode: "INTERNAL_ERROR" }));
      });
    });

    app.get("/api/admin/approvals", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.read")) return;
      res.json({ success: true, approvals: records().listApprovals(req.query.status) });
    });

    app.post("/api/admin/approvals", (req, res) => {
      Promise.resolve(postApproval(req, res)).catch(() => {
        if (!res.headersSent) res.status(500).json(closedBody({ errorCode: "INTERNAL_ERROR" }));
      });
    });

    app.post("/api/admin/approvals/:id/decide", (req, res) => {
      Promise.resolve(decideApproval(req, res)).catch(() => {
        if (!res.headersSent) res.status(500).json(closedBody({ errorCode: "INTERNAL_ERROR" }));
      });
    });

    app.get("/api/admin/control-center/escalations", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "security.read")) return;
      res.json({ success: true, escalations: coreApi().listEscalations(req.query.status) });
    });

    app.get("/api/admin/control-center/integrations", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "integrations.read")) return;
      const integrations = req.query.refresh === "1"
        ? await coreApi().refreshIntegrationStatus()
        : coreApi().listIntegrations();
      res.json({ success: true, integrations });
    });

    app.get("/api/admin/control-center/background-jobs", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, jobs: coreApi().listBackgroundJobs(Number(req.query.limit) || 50) });
    });

    app.get("/api/admin/control-center/jobs", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      try {
        const { listJobs } = require("../lib/jobQueue");
        res.json({
          success: true,
          jobs: listJobs({
            status: req.query.status,
            limit: Number(req.query.limit) || 50,
            offset: Number(req.query.offset) || 0,
          }),
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post("/api/admin/control-center/jobs", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      res.status(403).json(closedBody({
        errorCode: "LEGACY_JOB_ENQUEUE_BLOCKED",
        queued: false,
      }));
    });

    app.get("/api/admin/control-center/notifications", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, notifications: coreApi().listNotifications(Number(req.query.limit) || 50) });
    });

    app.get("/api/admin/categories/visibility", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "categories.read")) return;
      res.json({ success: true, visibility: coreApi().categoryVisibility.listAllStatuses() });
    });

    app.patch("/api/admin/categories/:categoryId/visibility", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "categories.write")) return;
      let entry;
      try {
        entry = coreApi().categoryVisibility.setCategoryStatus(
          req.params.categoryId,
          req.body?.status,
          { updatedBy: req.adminUser.email }
        );
      } catch (error) {
        if (error.code === "CATEGORY_VISIBILITY_INVALID") {
          res.status(400).json({
            success: false,
            errorCode: "CATEGORY_VISIBILITY_INVALID",
            errorKey: "category.visibility.invalid",
          });
          return;
        }
        if (error.code === "CATEGORY_NOT_FOUND") {
          res.status(404).json({
            success: false,
            errorCode: "CATEGORY_NOT_FOUND",
            errorKey: "category.notFound",
          });
          return;
        }
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      try {
        coreApi().categoryVisibility.persistToDb(require("../lib/db").db, req.params.categoryId, entry);
        coreApi().recordSystemEvent({
          eventType: "category.visibility",
          actorType: "admin",
          actorId: req.adminUser.email,
          resourceType: "category",
          resourceId: req.params.categoryId,
          summary: `Category ${req.params.categoryId} → ${req.body?.status}`,
        });
        logAuditFromRequest(req, {
          action: "category.visibility",
          entityType: "category",
          entityId: req.params.categoryId,
          newValue: req.body?.status,
        });
        res.json({ success: true, visibility: entry });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    });
  }

  return { register, postTask, patchTaskStatus, postApproval, decideApproval };
}

module.exports = {
  createControlCenterHandlers,
  register(app) {
    createControlCenterHandlers().register(app);
  },
};
