const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");
const jobQueue = require("../lib/jobQueue");
const jobWorker = require("../lib/jobWorker");
const jobScheduler = require("../lib/jobScheduler");
const { listJobLogs } = require("../lib/jobObservability");
const integrationHealth = require("../lib/integrationHealth");
const { listAdapters } = require("../lib/supplier/adapterRegistry");
const categoryReadiness = require("../lib/categoryReadiness");
const { JOB_TYPES } = require("../core/jobConstants");

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
    app.get("/api/admin/automation/overview", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({
        success: true,
        worker: jobWorker.getWorkerState(),
        jobCounts: jobQueue.countJobsByStatus(),
        schedules: jobScheduler.listSchedules({ limit: 10 }).length,
        integrations: integrationHealth.listAllHealth(),
        jobTypes: Object.values(JOB_TYPES),
      });
    });

    app.get("/api/admin/automation/worker", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, worker: jobWorker.getWorkerState() });
    });

    app.post("/api/admin/automation/worker/:action", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      const action = req.params.action;
      let state;
      if (action === "start") state = jobWorker.startWorker();
      else if (action === "pause") state = jobWorker.pauseWorker();
      else if (action === "resume") state = jobWorker.resumeWorker();
      else if (action === "stop") state = jobWorker.stopWorker();
      else return res.status(400).json({ success: false, errorKey: "automation.invalidAction" });

      logAuditFromRequest(req, {
        action: `worker.${action}`,
        entityType: "worker",
        entityId: "default",
      });
      res.json({ success: true, worker: state });
    });

    app.get("/api/admin/automation/jobs", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({
        success: true,
        jobs: jobQueue.listJobs({
          status: req.query.status,
          jobType: req.query.jobType,
          limit: Number(req.query.limit) || 50,
          offset: Number(req.query.offset) || 0,
        }),
        counts: jobQueue.countJobsByStatus(),
      });
    });

    app.get("/api/admin/automation/jobs/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      const job = jobQueue.getJob(req.params.id);
      if (!job) return res.status(404).json({ success: false, errorKey: "job.notFound" });
      res.json({ success: true, job, logs: listJobLogs(req.params.id, 50) });
    });

    app.post("/api/admin/automation/jobs/:id/retry", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      try {
        const job = jobQueue.retryJob(req.params.id);
        logAuditFromRequest(req, {
          action: "job.retry",
          entityType: "background_job",
          entityId: req.params.id,
        });
        res.json({ success: true, job });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    });

    app.post("/api/admin/automation/jobs/:id/cancel", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      const job = jobQueue.cancelJob(req.params.id);
      if (!job) return res.status(404).json({ success: false, errorKey: "job.notFound" });
      logAuditFromRequest(req, {
        action: "job.cancel",
        entityType: "background_job",
        entityId: req.params.id,
      });
      res.json({ success: true, job });
    });

    app.post("/api/admin/automation/jobs", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      const job = jobQueue.enqueueJob({
        jobType: req.body?.jobType || JOB_TYPES.SYSTEM_HEALTH,
        payload: req.body?.payload || {},
        priority: req.body?.priority,
        createdBy: req.adminUser.email,
      });
      logAuditFromRequest(req, {
        action: "job.enqueue",
        entityType: "background_job",
        entityId: job.id,
      });
      res.status(201).json({ success: true, job });
    });

    app.get("/api/admin/automation/schedules", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.read")) return;
      res.json({ success: true, schedules: jobScheduler.listSchedules({ limit: 50 }) });
    });

    app.post("/api/admin/automation/schedules", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      const schedule = jobScheduler.createSchedule({
        ...req.body,
        createdBy: req.adminUser.email,
      });
      logAuditFromRequest(req, {
        action: "schedule.create",
        entityType: "schedule",
        entityId: schedule.id,
      });
      res.status(201).json({ success: true, schedule });
    });

    app.delete("/api/admin/automation/schedules/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "system.configure")) return;
      const schedule = jobScheduler.disableSchedule(req.params.id);
      logAuditFromRequest(req, {
        action: "schedule.disable",
        entityType: "schedule",
        entityId: req.params.id,
      });
      res.json({ success: true, schedule });
    });

    app.get("/api/admin/automation/integrations/health", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "integrations.read")) return;
      const health = req.query.refresh === "1"
        ? await integrationHealth.runAllHealthChecks()
        : integrationHealth.listAllHealth();
      res.json({ success: true, health });
    });

    app.get("/api/admin/automation/suppliers", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "suppliers.read")) return;
      res.json({ success: true, suppliers: listAdapters() });
    });

    app.post("/api/admin/automation/sync/:kind", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "sync.run")) return;
      const kind = req.params.kind;
      const typeMap = {
        product: JOB_TYPES.PRODUCT_SYNC,
        price: JOB_TYPES.PRICE_SYNC,
        stock: JOB_TYPES.STOCK_SYNC,
        supplier: JOB_TYPES.SUPPLIER_SYNC,
      };
      const jobType = typeMap[kind];
      if (!jobType) return res.status(400).json({ success: false, errorKey: "sync.invalidKind" });
      const job = jobQueue.enqueueJob({
        jobType,
        payload: { ...(req.body || {}), dryRun: true },
        priority: req.body?.priority || "NORMAL",
        createdBy: req.adminUser.email,
      });
      logAuditFromRequest(req, {
        action: `sync.${kind}.enqueue`,
        entityType: "background_job",
        entityId: job.id,
      });
      res.status(201).json({ success: true, job });
    });

    app.get("/api/admin/automation/readiness/:categoryId", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "categories.read")) return;
      const result = await categoryReadiness.runChecksForCategory(req.params.categoryId);
      res.json({ success: true, readiness: result });
    });
  },
};
