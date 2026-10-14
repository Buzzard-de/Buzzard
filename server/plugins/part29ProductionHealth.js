"use strict";

const { getPublicFinalPreLaunchSummary } = require("../lib/release/finalPreLaunchAudit");

module.exports = {
  register(app) {
    app.get("/api/health/final-prelaunch-readiness", async (_req, res) => {
      try {
        const summary = await getPublicFinalPreLaunchSummary();
        res.json({ success: true, ...summary });
      } catch (err) {
        require("../lib/http/publicPluginError").sendPublicError(res, 500, "health.prelaunchFailed", err);
      }
    });
  },
};
