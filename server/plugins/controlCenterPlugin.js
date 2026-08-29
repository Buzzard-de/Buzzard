const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");
const controlCenter = require("../lib/controlCenter");
const { enqueueTaskProcessing, resumeAfterApproval } = require("../lib/aiOrchestrator");
const { getDatabaseHealth } = require("../lib/db");
const { getOrchestratorStatus } = require("../lib/orchestratorBridge");
const { getGuardianStatus } = require("../lib/guardianBridge");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
  return session;
}

function requirePerm(req, res, permission) {
  if (!requirePermission(req, res, permission)) return false;
  return true;
}

module.exports = {
  register(app) {
    app.get("/api/health/db", (_req, res) => {
      res.json({ success: true, database: getDatabaseHealth() });
    });

    app.get("/api/health/ai", async (_req, res) => {
      const orchestrator = await getOrchestratorStatus();
      const guardian = await getGuardianStatus();
      res.json({ success: true, orchestrator, guardian });
    });

    app.get("/api/categories/visibility", (_req, res) => {
      res.json({ success: true, visibility: controlCenter.categoryVisibility.listAllStatuses() });
    });

    app.get("/api/admin/control-center/status", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, ...(await controlCenter.getSystemStatus()) });
    });

    app.get("/api/admin/control-center/summary", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, summary: controlCenter.getDashboardSummary() });
    });

    app.get("/api/admin/control-center/activity", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "audit.read")) return;
      res.json({ success: true, activity: controlCenter.listActivity(Number(req.query.limit) || 50) });
    });

    app.get("/api/admin/control-center/search", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, results: controlCenter.globalSearch(req.query.q) });
    });

    app.get("/api/admin/control-center/security", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "security.read")) return;
      res.json({ success: true, ...controlCenter.getSecurityCenterSummary() });
    });

    app.get("/api/admin/control-center/config", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, config: controlCenter.getPublicConfig() });
    });

    app.put("/api/admin/control-center/config/:key", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      try {
        const result = controlCenter.setConfig(req.params.key, req.body?.value, req.adminUser.email);
        logAuditFromRequest(req, {
          action: "system.config.change",
          entityType: "config",
          entityId: req.params.key,
          newValue: req.body?.value,
        });
        res.json({ success: true, config: result });
      } catch (error) {
        res.status(400).json({ success: false, errorKey: "core.config.forbidden", message: error.message });
      }
    });

    app.get("/api/admin/ai/employees", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.read")) return;
      res.json({ success: true, employees: controlCenter.listAiEmployees() });
    });

    app.patch("/api/admin/ai/employees/:id/status", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.assign")) return;
      const employee = controlCenter.updateAiEmployeeStatus(req.params.id, req.body?.status);
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
        tasks: controlCenter.listAiTasks({
          status: req.query.status,
          employeeId: req.query.employeeId,
          limit: Number(req.query.limit) || 100,
        }),
      });
    });

    app.post("/api/admin/ai/tasks", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.assign")) return;
      try {
        const task = controlCenter.createAiTask({
          title: req.body?.title,
          description: req.body?.description,
          employeeId: req.body?.employeeId,
          priority: req.body?.priority,
          permissionsRequired: req.body?.permissionsRequired,
          payload: req.body?.payload,
          createdBy: req.adminUser.email,
          dependsOnTaskId: req.body?.dependsOnTaskId,
        });
        logAuditFromRequest(req, {
          action: "ai.task.create",
          entityType: "ai_task",
          entityId: task.id,
        });
        enqueueTaskProcessing(task.id);
        res.status(201).json({ success: true, task });
      } catch (error) {
        res.status(400).json({ success: false, errorKey: "ai.task.createFailed", message: error.message });
      }
    });

    app.patch("/api/admin/ai/tasks/:id/status", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.execute")) return;
      const task = controlCenter.updateTaskStatus(req.params.id, req.body?.status, {
        error: req.body?.error,
        result: req.body?.result,
      });
      if (!task) return res.status(404).json({ success: false, errorKey: "ai.task.notFound" });
      logAuditFromRequest(req, {
        action: "ai.task.status",
        entityType: "ai_task",
        entityId: req.params.id,
        newValue: req.body?.status,
      });
      res.json({ success: true, task });
    });

    app.get("/api/admin/approvals", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.read")) return;
      res.json({ success: true, approvals: controlCenter.listApprovals(req.query.status) });
    });

    app.post("/api/admin/approvals", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.assign")) return;
      const approval = controlCenter.createApproval(req.body || {});
      logAuditFromRequest(req, {
        action: "approval.create",
        entityType: "approval",
        entityId: approval.id,
      });
      res.status(201).json({ success: true, approval });
    });

    app.post("/api/admin/approvals/:id/decide", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.execute")) return;
      const decision = req.body?.decision === "approve" ? "approve" : "reject";
      const approval = controlCenter.decideApproval(req.params.id, decision, req.adminUser.email);
      if (!approval) return res.status(404).json({ success: false, errorKey: "approval.notFound" });
      logAuditFromRequest(req, {
        action: `approval.${decision}`,
        entityType: "approval",
        entityId: req.params.id,
      });
      if (decision === "approve" && approval?.taskId) {
        resumeAfterApproval(approval.taskId);
      }
      res.json({ success: true, approval });
    });

    app.get("/api/admin/control-center/escalations", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "security.read")) return;
      res.json({ success: true, escalations: controlCenter.listEscalations(req.query.status) });
    });

    app.get("/api/admin/control-center/integrations", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "integrations.read")) return;
      const integrations = req.query.refresh === "1"
        ? await controlCenter.refreshIntegrationStatus()
        : controlCenter.listIntegrations();
      res.json({ success: true, integrations });
    });

    app.get("/api/admin/control-center/background-jobs", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, jobs: controlCenter.listBackgroundJobs(Number(req.query.limit) || 50) });
    });

    app.get("/api/admin/control-center/notifications", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, notifications: controlCenter.listNotifications(Number(req.query.limit) || 50) });
    });

    app.get("/api/admin/categories/visibility", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "categories.read")) return;
      res.json({ success: true, visibility: controlCenter.categoryVisibility.listAllStatuses() });
    });

    app.patch("/api/admin/categories/:categoryId/visibility", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "categories.write")) return;
      try {
        const entry = controlCenter.categoryVisibility.setCategoryStatus(
          req.params.categoryId,
          req.body?.status,
          { updatedBy: req.adminUser.email, readiness: req.body?.readiness }
        );
        controlCenter.categoryVisibility.persistToDb(require("../lib/db").db, req.params.categoryId, entry);
        controlCenter.recordSystemEvent({
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
  },
};
