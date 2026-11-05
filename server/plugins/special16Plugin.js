/**
 * Read-only special-16 status. Does not claim live success.
 */
const { healthPayload } = require("../lib/special16/acceptance");
const { assessVoice } = require("../lib/voice/councilVoice");
const { assess } = require("../lib/commerce/taxConnect");

module.exports = {
  register(app) {
    app.get("/api/health/special-16", (_req, res) => {
      res.json({
        ...healthPayload(),
        voice: assessVoice(),
        taxConnect: assess(),
      });
    });
  },
};
