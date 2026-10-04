const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const orch = require("../lib/orchestrator");

function publicDisabled(res, code = "ORCHESTRATOR_DISABLED") {
  return res.status(503).json({ success: false, code, message: orch.userFacingError(code) });
}

module.exports = {
  register(app) {
    app.get("/api/health/orchestrator", (_req, res) => {
      res.json({ success: true, orchestrator: orch.status() });
    });

    app.post("/api/orchestrator/message", async (req, res) => {
      if (!orch.flags.getFlags().ORCHESTRATOR_ENABLED) return publicDisabled(res);
      const result = await orch.handleRequest({
        ...(req.body || {}),
        channel: "TEXT",
        ip: req.ip,
        userId: req.body?.userId || req.user?.id,
      });
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/voice/session", (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const session = orch.voice.createSession(req.body || {});
      res.json({ success: true, session });
    });

    app.post("/api/orchestrator/voice/transcribe", async (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const result = await orch.stt.transcribeAudio(req.body || {});
      res.status(result.ok ? 200 : 503).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/voice/synthesize", async (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const result = await orch.tts.synthesize(req.body || {});
      res.status(result.ok ? 200 : 503).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/phone/call", async (req, res) => {
      if (!orch.flags.getFlags().PHONE_ENABLED) return publicDisabled(res, "PHONE_PROVIDER_NOT_CONFIGURED");
      const result = await orch.phone.startOutbound(req.body || {});
      res.status(result.ok ? 200 : 503).json({ success: Boolean(result.ok), ...result });
    });

    app.post("/api/orchestrator/phone/webhook", (req, res) => {
      const accepted = orch.acceptEvent({
        eventId: req.body?.eventId || req.headers["x-event-id"],
        payload: req.body,
        signature: req.headers["x-signature"] || req.body?.signature,
        timestamp: req.headers["x-timestamp"] || req.body?.timestamp,
        secret: process.env.TELEPHONY_WEBHOOK_SECRET,
      });
      if (!accepted.ok) return res.status(401).json({ success: false, ...accepted });
      if (req.body?.callId && req.body?.type) {
        orch.phone.applyEvent(req.body.callId, req.body.type);
      }
      res.json({ success: true, ...accepted });
    });

    app.get("/api/orchestrator/conversations/:id", (req, res) => {
      if (!orch.flags.getFlags().ORCHESTRATOR_ENABLED) return publicDisabled(res);
      const conversation = orch.conversations.getConversation(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, code: "NOT_FOUND" });
      res.json({ success: true, conversation });
    });

    app.get("/api/orchestrator/tasks/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const task = orch.tasks.getTask(req.params.id);
      if (!task) return res.status(404).json({ success: false, code: "NOT_FOUND" });
      res.json({ success: true, task });
    });

    app.post("/api/orchestrator/approval/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "ai.execute")) return;
      const result = orch.approvals.decide({
        approvalId: req.params.id,
        approved: req.body?.approved !== false,
        actor: req.adminUser?.email || req.user?.email || "admin",
      });
      res.json({ success: true, result });
    });

    app.get("/api/admin/orchestrator/dashboard", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      res.json({ success: true, dashboard: orch.dashboard() });
    });
  },
};
