const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { statusSnapshot } = require("../lib/logistics/v5/statusSnapshot");
const { runDryRun } = require("../lib/logistics/v5/operationsPlane");
const { isSalesEnabled } = require("../lib/salesMode");

module.exports = {
  register(app) {
    app.get("/api/admin/eu27-logistics/status", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.read")) return;
      return res.json({
        success: true,
        live: false,
        salesEnabled: isSalesEnabled(),
        snapshot: statusSnapshot(),
      });
    });

    app.post("/api/admin/eu27-logistics/dry-run", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.read")) return;
      const body = req.body || {};
      return res.json({
        success: true,
        live: false,
        result: runDryRun({
          destination: body.destination || "DE",
          originCountry: body.originCountry || "DE",
          postalCode: body.postalCode,
          weightKg: body.weightKg,
          productClass: body.productClass,
          supplierId: body.supplierId,
          connectMode: body.connectMode,
          partyKnown: false,
        }),
      });
    });
  },
};
