/**
 * Final production go-live dashboard (#354) — read-only diagnostics.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let mod = null;

function load() {
  if (mod) return mod;
  try {
    mod = require("../lib/FinalProductionGoLive.bundle.cjs");
    return mod;
  } catch (err) {
    console.warn("Final production go-live bundle unavailable:", err.message);
    return null;
  }
}

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = { userId: session.userId, id: session.userId, email: session.email, role: session.role };
  return session;
}

module.exports = {
  register(app) {
    if (process.env.BUZZARD_FINAL_PRODUCTION_GO_LIVE === "0") {
      console.log("Final production go-live API disabled (BUZZARD_FINAL_PRODUCTION_GO_LIVE=0)");
      return;
    }

    app.get("/api/health/final-production-go-live", (_req, res) => {
      const bundle = load();
      if (!bundle) {
        return res.status(503).json({ success: false, errorCode: "FINAL_GO_LIVE_UNAVAILABLE" });
      }
      const gate = bundle.evaluateFinalProductionGate();
      return res.json({
        success: true,
        phase: gate.phase,
        salesEnabled: gate.salesEnabled,
        liveStatus: gate.liveStatus,
        blockers: gate.blockers.length,
        realSideEffects: gate.safetyCounters,
      });
    });

    app.get("/api/admin/final-production-go-live/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const bundle = load();
      if (!bundle) return res.status(503).json({ success: false, errorCode: "FINAL_GO_LIVE_UNAVAILABLE" });
      return res.json({
        success: true,
        data: bundle.getFinalProductionGoLiveDashboard(),
        source: "final-production-go-live",
      });
    });

    app.get("/api/admin/final-production-go-live/missing-access", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      let accessMod = null;
      try {
        accessMod = require("../lib/productionAccess.bundle.cjs");
      } catch {
        return res.status(503).json({ success: false, errorCode: "PRODUCTION_ACCESS_UNAVAILABLE" });
      }
      return res.json({
        success: true,
        data: accessMod.buildMissingProductionAccessReport(),
        source: "missing-production-access",
      });
    });

    app.get("/api/admin/final-production-go-live/closure", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      let closureMod = null;
      try {
        closureMod = require("../lib/finalClosure.bundle.cjs");
      } catch {
        return res.status(503).json({ success: false, errorCode: "FINAL_CLOSURE_UNAVAILABLE" });
      }
      return res.json({
        success: true,
        data: closureMod.buildFinalClosureReport(),
        source: "final-closure",
      });
    });

    app.get("/api/admin/final-production-go-live/go-live-check", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      let closureMod = null;
      try {
        closureMod = require("../lib/finalClosure.bundle.cjs");
      } catch {
        return res.status(503).json({ success: false, errorCode: "FINAL_CLOSURE_UNAVAILABLE" });
      }
      return res.json({
        success: true,
        data: closureMod.runFinalGoLiveCheck(),
        source: "final-closure",
      });
    });

    app.get("/api/admin/final-production-go-live/completion", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      let completionMod = null;
      try {
        completionMod = require("../lib/productionCompletion.bundle.cjs");
      } catch {
        return res.status(503).json({ success: false, errorCode: "PRODUCTION_COMPLETION_UNAVAILABLE" });
      }
      return res.json({
        success: true,
        data: completionMod.buildFinalProductionCompletionReport(),
        source: "production-completion",
      });
    });

    app.get("/api/admin/final-production-go-live/status-report", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const bundle = load();
      if (!bundle) return res.status(503).json({ success: false, errorCode: "FINAL_GO_LIVE_UNAVAILABLE" });
      return res.json({
        success: true,
        data: bundle.buildFinalProductionStatusReport(),
        source: "final-production-go-live",
      });
    });
  },
};
