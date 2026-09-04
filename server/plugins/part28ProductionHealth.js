"use strict";

const { getPublicFinalGoLiveSummary } = require("../lib/release/finalGoLiveReadiness");

module.exports = {
  register(app) {
    app.get("/api/health/final-go-live-readiness", (_req, res) => {
      res.json({ success: true, ...getPublicFinalGoLiveSummary() });
    });
  },
};
