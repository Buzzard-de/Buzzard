/**
 * Part 26 — Final production hardening API (diagnostic only, no activation).
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const adminSafetyGate = require("../lib/operations/adminSafetyGate");
const {
  evaluateFinalProductionHardening,
  evaluatePublicFinalHardeningSummary,
} = require("../lib/release/finalProductionHardening");
const { evaluateReleaseSafety } = require("../lib/release/releaseSafetyGate");
const releaseReadinessCenter = require("../lib/release/releaseReadinessCenter");
const {
  recordFinalHardeningAction,
  listRecentFinalHardeningAudit,
} = require("../lib/release/finalProductionHardeningAudit");
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
    app.get("/api/admin/release/final-readiness", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const report = await evaluateFinalProductionHardening({ adminDetail: true });
      res.json({ success: true, ...report });
    });

    app.get("/api/admin/release/final-hardening", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const report = await evaluateFinalProductionHardening({ adminDetail: true });
      res.json({ success: true, ...report });
    });

    app.get("/api/admin/release/final-audit", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "audit.read")) return;
      const limit = Math.min(Number(req.query?.limit) || 25, 100);
      res.json({
        success: true,
        diagnosticOnly: true,
        autoActivate: false,
        entries: listRecentFinalHardeningAudit(limit),
      });
    });

    app.post("/api/admin/release/final-validate", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      try {
        adminSafetyGate.requireAdminAction("go_live", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const safety = evaluateReleaseSafety(
        releaseReadinessCenter.buildSafeEnv(),
        {
          productionSafetyLock: true,
          supplierOrdersBlocked: true,
          stripeEnabled: false,
          paypalEnabled: false,
        }
      );
      const report = await evaluateFinalProductionHardening({ adminDetail: false });
      recordFinalHardeningAction(req, {
        action: AUDIT_ACTIONS.ADMIN_CHANGE,
        result: safety.status === "PASS" ? "dry_run" : "blocked",
        dryRun: true,
        metadata: {
          safetyStatus: safety.status,
          decisionStatus: report.FINAL_PRODUCTION_HARDENING.decision.status,
        },
      });
      res.json({
        success: true,
        dryRun: true,
        diagnosticOnly: true,
        autoActivate: false,
        validationOnly: true,
        safety,
        decision: report.FINAL_PRODUCTION_HARDENING.decision,
        gateSummary: report.FINAL_PRODUCTION_HARDENING.gateSummary,
      });
    });
  },
  evaluatePublicFinalHardeningSummary,
};
