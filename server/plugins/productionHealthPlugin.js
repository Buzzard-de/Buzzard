/**
 * Part 13 — Production health endpoints
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const productionHealth = require("../lib/productionHealth");
const { getDeploymentDrift } = require("../lib/deploymentIdentity");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    role: session.role,
  };
  return session;
}

function mapReadinessStatus(summary) {
  const checks = [];
  const push = (name, ok, detail) => {
    checks.push({ name, status: ok ? "PASS" : ok === null ? "UNKNOWN" : "BLOCKED", detail });
  };

  push("database", summary.database?.integrity?.status === "OK", summary.database?.integrity?.integrityCheck);
  push("persistence", summary.database?.persistence?.persistent === true, summary.database?.persistence?.mode);
  push("environment", summary.environment?.ok === true, summary.environment?.errors?.[0]?.message || "ok");
  push("deployment", summary.deployment?.status === "SYNCED", summary.deployment?.status);
  push("redis", summary.redis?.ok !== false, summary.redis?.status);
  push("worker", summary.worker?.enabled && summary.worker?.status === "RUNNING", summary.worker?.status);
  push("catalog", summary.catalog?.status === "OK", `${summary.catalog?.productCount ?? 0} products`);
  push("commerce_safety", summary.commerce?.salesEnabled === false, `sales=${summary.commerce?.salesEnabled}`);
  push("go_live_lock", summary.goLiveLock === true, "ACTIVE");

  const blocked = checks.filter((c) => c.status === "BLOCKED").length;
  const overall = blocked > 0 ? "BLOCKED" : summary.overall === "OK" ? "PASS" : "WARNING";

  return { overall, checks };
}

module.exports = {
  register(app) {
    app.get("/api/health/version", (_req, res) => {
      res.json({ success: true, ...productionHealth.getVersionPayload() });
    });

    app.get("/api/health/worker", (_req, res) => {
      res.json({ success: true, worker: productionHealth.getWorkerHealth() });
    });

    app.get("/api/health/production", async (_req, res) => {
      const summary = await productionHealth.getProductionSummary();
      res.json({ success: true, ...summary });
    });

    app.get("/api/health/go-live-readiness", async (_req, res) => {
      const goLiveReadiness = require("../lib/operations/goLiveReadiness");
      const readiness = await goLiveReadiness.evaluateGoLiveReadiness();
      res.json({ success: true, GO_LIVE_READINESS: readiness });
    });

    app.get("/api/health/operations", async (_req, res) => {
      const monitoringReadiness = require("../lib/operations/monitoringReadiness");
      const snapshot = await monitoringReadiness.getMonitoringSnapshot();
      res.json({ success: true, ...snapshot });
    });

    app.get("/api/health/storefront-readiness", (_req, res) => {
      const storefrontReadiness = require("../lib/storefront/storefrontReadiness");
      res.json({ success: true, ...storefrontReadiness.evaluateStorefrontReadiness() });
    });

    app.get("/api/health/customer-experience-readiness", (_req, res) => {
      const customerExperienceReadiness = require("../lib/customer/customerExperienceReadiness");
      res.json({ success: true, ...customerExperienceReadiness.evaluateCustomerExperienceReadiness() });
    });

    app.get("/api/health/admin-backoffice-readiness", async (_req, res) => {
      const adminReadiness = require("../lib/operations/adminReadiness");
      const report = await adminReadiness.evaluateAdminReadiness();
      res.json({ success: true, ...report });
    });

    app.get("/api/admin/control-center/deployment", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const expected = req.query?.expectedCommit || req.query?.expected || null;
      const summary = await productionHealth.getProductionSummary();
      const drift = getDeploymentDrift(expected);
      const readiness = mapReadinessStatus(summary);
      res.json({
        success: true,
        generatedAt: new Date().toISOString(),
        deployment: drift,
        readiness,
        summary,
      });
    });
  },
};
