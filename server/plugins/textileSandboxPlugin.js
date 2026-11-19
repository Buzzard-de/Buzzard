/**
 * Public textile AI sandbox routes (no live try-on, sales stay locked).
 */
const { runSandboxSession, assessTextile } = require("../lib/storefront/textileSandbox");

module.exports = {
  register(app) {
    app.get("/api/storefront/textile/sandbox/status", (_req, res) => {
      res.json({
        success: true,
        ...assessTextile(),
        live: false,
        salesEnabled: false,
        productionReady: false,
      });
    });

    app.post("/api/storefront/textile/sandbox/session", (req, res) => {
      const result = runSandboxSession(req.body || {});
      const status = result.ok ? 200 : 403;
      res.status(status).json({ success: result.ok, ...result });
    });
  },
};