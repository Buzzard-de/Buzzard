/**
 * Read-only special-16 status. No sales or live provider calls.
 */
const { matrix, completeClaim } = require("../lib/special16/acceptance");
const { assessVoice } = require("../lib/voice/councilVoice");
const { assess } = require("../lib/commerce/taxConnect");

module.exports = {
  register(app) {
    app.get("/api/health/special-16", (_req, res) => {
      res.json({
        success: true,
        completeClaim: completeClaim(),
        liveVerified: false,
        salesEnabled: false,
        voice: assessVoice(),
        taxConnect: assess(),
        requirements: matrix(),
      });
    });
  },
};
