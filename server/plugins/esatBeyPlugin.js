/**
 * Esat Bey health. Event details stay off the public body.
 */
const { activate, status } = require("../lib/security/esatBey");

module.exports = {
  register(app) {
    activate();
    app.get("/api/health/esat", (_req, res) => {
      res.json({ success: true, esat: status() });
    });
  },
};
