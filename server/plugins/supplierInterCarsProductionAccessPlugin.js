/**
 * Inter Cars production access preparation — dry-run diagnostics only.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let access = null;

function loadAccess() {
  if (access) return access;
  try {
    access = require("../lib/supplierInterCarsProductionAccess.bundle.cjs");
    return access;
  } catch (err) {
    console.warn("Inter Cars production access bundle unavailable:", err.message);
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
    if (process.env.BUZZARD_INTER_CARS_PRODUCTION_ACCESS === "0") {
      console.log("Inter Cars production access API disabled (BUZZARD_INTER_CARS_PRODUCTION_ACCESS=0)");
      return;
    }

    app.get("/api/admin/inter-cars-production-access/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.read")) return;
      const mod = loadAccess();
      if (!mod) return res.status(503).json({ success: false, errorCode: "PRODUCTION_ACCESS_UNAVAILABLE" });
      return res.json({
        success: true,
        data: mod.getProductionAccessDashboard(),
        source: "inter-cars-production-access",
      });
    });

    app.post("/api/admin/inter-cars-production-access/preflight", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.manage")) return;
      const mod = loadAccess();
      if (!mod) return res.status(503).json({ success: false, errorCode: "PRODUCTION_ACCESS_UNAVAILABLE" });
      const diagnostic = mod.evaluateInterCarsProductionAccess();
      const preflight = mod.runProductionAccessPreflight();
      return res.json({
        success: true,
        data: { diagnostic, preflight },
        safety: mod.getProductionAccessSafetyCounters(),
        source: "inter-cars-production-access",
      });
    });
  },
};
