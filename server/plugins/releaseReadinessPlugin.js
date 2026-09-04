/**
 * Part 25 — Production release readiness API (diagnostic only, no activation).
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const adminSafetyGate = require("../lib/operations/adminSafetyGate");
const releaseReadinessCenter = require("../lib/release/releaseReadinessCenter");
const { evaluateRollbackReadiness } = require("../lib/release/releaseRollbackReadiness");
const { buildReleaseManifest } = require("../lib/release/releaseManifest");
const { getDeploymentIdentity } = require("../lib/deploymentIdentity");
const { recordReleaseAction } = require("../lib/release/releaseAudit");
const { evaluateReleaseSafety } = require("../lib/release/releaseSafetyGate");
const { AUDIT_ACTIONS } = require("../core/operationsConstants");

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

module.exports = {
  register(app) {
    app.get("/api/admin/release/readiness", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const report = await releaseReadinessCenter.evaluateProductionReleaseReadiness();
      res.json({ success: true, ...report });
    });

    app.get("/api/admin/release/manifest", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const deployment = getDeploymentIdentity();
      const manifest = buildReleaseManifest({
        version: "part25",
        commit: deployment.commitFull || deployment.commit,
      });
      res.json({ success: true, manifest });
    });

    app.get("/api/admin/release/rollback", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const deployment = getDeploymentIdentity();
      const rollback = evaluateRollbackReadiness({
        previousRelease: deployment.commitFull !== "unknown" ? deployment.commitFull : null,
        databaseRollback: true,
        configurationRollback: true,
      });
      res.json({ success: true, rollback });
    });

    app.post("/api/admin/release/validate", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      try {
        adminSafetyGate.requireAdminAction("go_live", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const safety = evaluateReleaseSafety(
        releaseReadinessCenter.buildSafeEnv(),
        { productionSafetyLock: true, supplierOrdersBlocked: true, stripeEnabled: false, paypalEnabled: false }
      );
      const report = await releaseReadinessCenter.evaluateProductionReleaseReadiness();
      recordReleaseAction(req, {
        action: AUDIT_ACTIONS.ADMIN_CHANGE,
        result: safety.status === "PASS" ? "dry_run" : "blocked",
        dryRun: true,
        metadata: { safetyStatus: safety.status },
      });
      res.json({
        success: true,
        dryRun: true,
        validationOnly: true,
        safety,
        overall: report.PRODUCTION_RELEASE_READINESS.status,
        autoActivate: false,
      });
    });
  },
};
