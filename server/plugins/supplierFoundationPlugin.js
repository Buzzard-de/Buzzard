/**
 * Supplier Integration Engine — production foundation admin API.
 * No secrets exposed; dry-run sync/order only.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let foundation = null;

function loadFoundation() {
  if (foundation) return foundation;
  try {
    foundation = require("../lib/supplierFoundation.bundle.cjs");
    return foundation;
  } catch (err) {
    console.warn("Supplier foundation bundle unavailable:", err.message);
    return null;
  }
}

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
    if (process.env.BUZZARD_SUPPLIER_FOUNDATION === "0") {
      console.log("Supplier foundation API disabled (BUZZARD_SUPPLIER_FOUNDATION=0)");
      return;
    }

    app.get("/api/admin/supplier-foundation/overview", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const rows = await mod.getSupplierEngineAdminOverview();
      return res.json({ success: true, data: rows, source: "supplier-foundation" });
    });

    app.post("/api/admin/supplier-foundation/:supplierId/sync", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.write")) return;
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const sanitized = mod.sanitizeClientSyncRequest(req.body || {});
      if (!sanitized.allowed) {
        return res.status(400).json({ success: false, errorCode: sanitized.reason });
      }
      const jobType = String(req.body?.jobType || "FULL");
      const integrationType = req.body?.integrationType;
      const result = await mod.runSupplierSyncJob(req.params.supplierId, { jobType, integrationType });
      return res.json({ success: true, data: result, source: "supplier-foundation" });
    });

    app.post("/api/admin/supplier-foundation/:supplierId/order-dry-run", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      if (mod.rejectClientCredentials(req.body || {})) {
        return res.status(400).json({ success: false, errorCode: "CREDENTIALS_NOT_ALLOWED" });
      }
      const validation = mod.validateSupplierOrderPayload({
        supplierId: req.params.supplierId,
        ...req.body,
      });
      if (!validation.valid) {
        return res.status(400).json({ success: false, errors: validation.errors });
      }
      const result = await mod.createSupplierOrder({
        supplierId: req.params.supplierId,
        ...req.body,
      });
      return res.json({ success: true, data: result, payload: validation.payload, source: "supplier-foundation" });
    });

    app.get("/api/admin/supplier-foundation/:supplierId/cursor", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const mod = loadFoundation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const cursor = mod.getSyncCursor(req.params.supplierId);
      return res.json({ success: true, data: cursor ?? null, source: "supplier-foundation" });
    });
  },
};
