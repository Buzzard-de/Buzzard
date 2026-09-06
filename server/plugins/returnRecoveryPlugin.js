const { requirePermission } = require("../lib/adminGuard");
const returnRecovery = require("../core/returnRecovery");

function readIdempotencyKey(req) {
  return (
    req.headers["idempotency-key"] ||
    req.headers["x-idempotency-key"] ||
    req.body?.idempotencyKey ||
    req.body?.idempotency_key ||
    null
  );
}

function handleError(res, err) {
  const code = err.code || "RETURN_ERROR";
  const status =
    code === "RETURN_NOT_FOUND"
      ? 404
      : code === "PERMISSION_DENIED"
        ? 403
        : code === "RETURN_ALREADY_EXISTS" || code === "CREDIT_NOTE_DUPLICATE"
          ? 409
          : 400;
  return res.status(status).json({
    success: false,
    error: code,
    message: err.message,
    details: err.details || null,
    returnCase: err.details?.returnCase || undefined,
  });
}

module.exports = {
  register(app) {
    app.get("/api/admin/returns", (req, res) => {
      if (!requirePermission(req, res, "returns.read")) return;
      const filter = {
        status: req.query.status,
        pending: req.query.filter === "pending",
        supplierRecoveryPending: req.query.filter === "supplier_recovery_pending",
        unrecovered: req.query.filter === "unrecovered",
        liability: req.query.liability,
      };
      const cases = returnRecovery.listReturnCases(filter).map(returnRecovery.enrichForDashboard);
      return res.json({ success: true, returns: cases, safety: returnRecovery.getSafetyStatus() });
    });

    app.get("/api/admin/returns/:id", (req, res) => {
      if (!requirePermission(req, res, "returns.read")) return;
      try {
        const returnCase = returnRecovery.enrichForDashboard(returnRecovery.getReturnCase(req.params.id));
        const auditEntries = returnRecovery.listAuditForCase(req.params.id);
        return res.json({ success: true, returnCase, audit: auditEntries });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns", (req, res) => {
      if (!requirePermission(req, res, "returns.write")) return;
      try {
        const key = readIdempotencyKey(req);
        const returnCase = returnRecovery.createReturnCase(req.body || {}, {
          idempotencyKey: key,
          actor: req.adminUser?.email || "admin",
        });
        return res.status(201).json({ success: true, returnCase });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/approve", (req, res) => {
      if (!requirePermission(req, res, "returns.approve")) return;
      try {
        const returnCase = returnRecovery.approveReturn(req.params.id, {
          actor: req.adminUser?.email || "admin",
        });
        return res.json({ success: true, returnCase });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/receive", (req, res) => {
      if (!requirePermission(req, res, "returns.write")) return;
      try {
        const returnCase = returnRecovery.receiveReturn(req.params.id, req.body || {}, {
          actor: req.adminUser?.email || "admin",
        });
        return res.json({ success: true, returnCase });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/inspect", (req, res) => {
      if (!requirePermission(req, res, "returns.inspect")) return;
      try {
        const returnCase = returnRecovery.inspectReturn(req.params.id, req.body || {}, {
          actor: req.adminUser?.email || "admin",
        });
        return res.json({ success: true, returnCase });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/refund/calculate", (req, res) => {
      if (!requirePermission(req, res, "returns.refund")) return;
      try {
        const result = returnRecovery.calculateRefundForCase(req.params.id);
        return res.json({ success: true, ...result });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/refund/request", (req, res) => {
      if (!requirePermission(req, res, "returns.refund")) return;
      try {
        const result = returnRecovery.requestCustomerRefund(req.params.id, {
          idempotencyKey: readIdempotencyKey(req),
          actor: req.adminUser?.email || "admin",
        });
        return res.json({ success: true, ...result });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/supplier-recovery", (req, res) => {
      if (!requirePermission(req, res, "returns.supplier_recovery")) return;
      try {
        const result = returnRecovery.createSupplierRecoveryClaim(req.params.id, {
          idempotencyKey: readIdempotencyKey(req),
          actor: req.adminUser?.email || "admin",
          dryRun: req.body?.dryRun !== false,
        });
        return res.json({ success: true, ...result });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/supplier-recovery/confirm", (req, res) => {
      if (!requirePermission(req, res, "returns.supplier_recovery")) return;
      try {
        const result = returnRecovery.confirmSupplierRecovery(req.params.id, req.body || {}, {
          idempotencyKey: readIdempotencyKey(req),
          actor: req.adminUser?.email || "admin",
        });
        return res.json({ success: true, ...result });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/reconcile", (req, res) => {
      if (!requirePermission(req, res, "returns.read")) return;
      try {
        const result = returnRecovery.reconcileReturnCase(req.params.id, {
          actor: req.adminUser?.email || "admin",
        });
        return res.json({ success: true, ...result });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.post("/api/admin/returns/:id/close", (req, res) => {
      if (!requirePermission(req, res, "returns.close")) return;
      try {
        const returnCase = returnRecovery.closeReturnCase(req.params.id, {
          actor: req.adminUser?.email || "admin",
        });
        return res.json({ success: true, returnCase });
      } catch (err) {
        return handleError(res, err);
      }
    });

    app.get("/api/admin/returns-health", (req, res) => {
      if (!requirePermission(req, res, "returns.read")) return;
      return res.json({
        success: true,
        engine: "return_recovery",
        safety: returnRecovery.getSafetyStatus(),
      });
    });
  },
};
