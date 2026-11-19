const { processInboundEmail } = require("../lib/customer/incomingEmailProcessor");
const { processBatch } = require("../lib/customer/incomingEmailQueue");

module.exports = {
  register(app) {
    app.post("/api/customer/email/inbound/process", (req, res) => {
      const result = processInboundEmail(req.body || {});
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    });
    app.post("/api/customer/email/inbound/batch", (req, res) => {
      const batch = processBatch(Array.isArray(req.body?.messages) ? req.body.messages : []);
      res.json({ success: batch.ok, ...batch });
    });
  },
};