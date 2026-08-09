const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const returnsRma = require("../lib/returnsRma");

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
      const result = returnsRma.createReturn(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
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
