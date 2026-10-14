const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");

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

module.exports = {
  register(app) {
    app.get("/api/health/pusat", async (_req, res) => {
      const pusat = require("../lib/pusat");
      const health = await pusat.getHealth();
      const { path: _omittedPath, error: _omittedError, ...publicDb } = health.database || {};
      res.json({
        success: true,
        ...health,
        database: {
          ok: publicDb.ok,
          persistent: publicDb.persistent,
          ephemeralRisk: publicDb.ephemeralRisk,
        },
      });
    });

    app.get("/api/admin/pusat/health", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const pusat = require("../lib/pusat");
      res.json({ success: true, ...(await pusat.getHealth()) });
    });

    app.get("/api/admin/pusat/agents", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const pusat = require("../lib/pusat");
      res.json({ success: true, agents: pusat.agents.listAgents() });
    });

    app.get("/api/admin/pusat/report", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const pusat = require("../lib/pusat");
      res.json({ success: true, report: pusat.report() });
    });

    app.get("/api/admin/pusat/memory", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const pusat = require("../lib/pusat");
      res.json({
        success: true,
        records: pusat.memory.readMemory({
          subject: req.query.subject,
          kind: req.query.kind,
          taskId: req.query.taskId,
          role: req.adminUser.role,
          limit: Number(req.query.limit) || 50,
        }),
      });
    });

    app.get("/api/admin/pusat/exceptions", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "security.read")) return;
      const pusat = require("../lib/pusat");
      res.json({
        success: true,
        exceptions: pusat.exceptions.listExceptions({
          status: req.query.status,
          taskId: req.query.taskId,
        }),
      });
    });

    app.post("/api/admin/pusat/tasks", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.assign")) return;
      try {
        const pusat = require("../lib/pusat");
        const submitted = pusat.submitTask({
          title: req.body?.title,
          description: req.body?.description,
          employeeId: req.body?.employeeId,
          agentCode: req.body?.agentCode,
          priority: req.body?.priority,
          permissionsRequired: req.body?.permissionsRequired,
          payload: req.body?.payload,
          createdBy: req.adminUser.email,
          dependsOnTaskId: req.body?.dependsOnTaskId,
          idempotencyKey: req.body?.idempotencyKey || req.headers["idempotency-key"],
          correlationId: req.body?.correlationId,
          timeoutMs: req.body?.timeoutMs,
          enqueue: req.body?.enqueue !== false,
        });
        logAuditFromRequest(req, {
          action: "pusat.task.submit",
          entityType: "ai_task",
          entityId: submitted.task?.id,
        });
        res.status(submitted.duplicate ? 200 : 201).json({ success: true, ...submitted });
      } catch (error) {
        const status = Number(error.statusCode) || (error.code === "IDEMPOTENCY_CONFLICT" ? 409 : 400);
        res.status(status).json({
          success: false,
          errorKey: error.code === "IDEMPOTENCY_CONFLICT" ? "pusat.task.idempotencyConflict" : "pusat.task.submitFailed",
          code: error.code || null,
          message: error.message,
        });
      }
    });
  },
};
