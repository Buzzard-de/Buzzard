const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const returnsRma = require("../lib/returnsRma");
const { requireCustomerSession } = require("../lib/customer/customerAuthBridge");
const { assertReturnRequestAllowed } = require("../lib/customer/customerMutationGuard");
const {
  recordCustomerAction,
  CUSTOMER_AUDIT_ACTIONS,
} = require("../lib/customer/customerExperienceAudit");

function requireAnyAdmin(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      const user = verifyToken(bearer);
      if (user.role === "admin") {
        req.user = user;
        return user;
      }
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ error: "Admin access required" });
  return null;
}

module.exports = {
  register(app) {
    if (!returnsRma.isEnabled()) {
      console.log("Returns RMA disabled (BUZZARD_RETURNS_RMA=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/returns-rma/returns", (req, res) => {
      const session = requireCustomerSession(req, res);
      if (!session) return;

      const block = assertReturnRequestAllowed({ req });
      if (block?.blocked) {
        recordCustomerAction(req, {
          action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_RETURN_REQUEST,
          resource: "return",
          resourceId: req.body?.orderNumber || req.body?.order_number || "unknown",
          result: "blocked",
          reason: block.code,
        });
        return res.status(block.status || 403).json({
          success: false,
          error: block.code,
          message: block.message,
          failClosed: true,
        });
      }

      const body = {
        ...(req.body || {}),
        customerId: session.customerId,
        customerEmail: session.email,
      };
      const result = returnsRma.createReturn(body);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });

      recordCustomerAction(req, {
        action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_RETURN_REQUEST,
        resource: "return",
        resourceId: result.return?.rma_number || result.return?.id,
        result: "success",
      });

      try {
        const automationEngine = require("../lib/automationEngine");
        automationEngine.emit(
          "return_request",
          {
            rmaNumber: result.return?.rma_number,
            orderNumber: body.orderNumber || body.order_number,
            customerId: session.customerId,
            testOnly: true,
          },
          { idempotencyKey: `return_${result.return?.rma_number}` }
        );
      } catch {
        /* non-blocking */
      }

      return res.status(201).json(result.return);
    });

    app.get("/api/returns-rma/returns/:rmaNumber", (req, res) => {
      const result = returnsRma.getReturnByRma(req.params.rmaNumber);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/returns-rma/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(returnsRma.getRmaOverview());
    });

    app.get("/api/admin/returns-rma/returns", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(returnsRma.listReturns(req.query || {}));
    });

    app.patch("/api/admin/returns-rma/returns/:id/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = returnsRma.updateReturnStatus(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.return);
    });

    app.patch("/api/admin/returns-rma/returns/:id/inspection", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = returnsRma.updateInspection(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/returns-rma/returns/:id/label", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = returnsRma.createReturnLabel(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(201).json(result.label);
    });

    app.post("/api/admin/returns-rma/returns/:id/refund", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = returnsRma.processRefund(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/returns-rma/returns/:id/exchange", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = returnsRma.processExchange(req.params.id);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/returns-rma/returns/:id/warranty", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = returnsRma.createWarrantyClaim(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(201).json(result.claim);
    });

    app.post("/api/admin/returns-rma/returns/:id/note", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(returnsRma.addReturnNote(req.params.id, req.body || {}));
    });
  },
};
