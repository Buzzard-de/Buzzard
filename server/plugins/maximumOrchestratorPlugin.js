const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const orch = require("../lib/orchestrator");
const webrtc = require("../lib/orchestrator/providers/webrtc");
const { validateProduction } = require("../lib/orchestrator/productionValidator");
const { checkLimit } = require("../lib/orchestrator/rateLimit");

function publicDisabled(res, code = "ORCHESTRATOR_DISABLED") {
  return res.status(503).json({ success: false, code, message: orch.userFacingError(code) });
}

module.exports = {
  register(app) {
    app.get("/api/health/orchestrator", (_req, res) => {
      res.json({ success: true, orchestrator: orch.status(), production: validateProduction() });
    });

    app.post("/api/orchestrator/message", async (req, res) => {
      if (!orch.flags.getFlags().ORCHESTRATOR_ENABLED) return publicDisabled(res);
      const result = await orch.handleRequest({
        ...(req.body || {}),
        channel: req.body?.channel || "TEXT",
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

    app.get("/api/orchestrator/voice/session/:id", (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const session = orch.voice.getSession(req.params.id);
      if (!session) return res.status(404).json({ success: false, code: "SESSION_NOT_FOUND" });
      res.json({ success: true, session });
    });

    app.post("/api/orchestrator/voice/session/:id/barge-in", (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      res.json({ success: true, ...orch.voice.bargeIn(req.params.id) });
    });

    app.post("/api/orchestrator/voice/session/:id/heartbeat", (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      res.json({ success: true, ...orch.voice.heartbeat(req.params.id) });
    });

    app.post("/api/orchestrator/voice/transcribe", async (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const limit = checkLimit({ ip: req.ip, scope: "stt" });
      if (!limit.allowed) return res.status(429).json({ success: false, code: "RATE_LIMITED" });
      const result = await orch.stt.transcribe(req.body || {});
      res.status(result.ok ? 200 : 503).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/voice/synthesize", async (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const limit = checkLimit({ ip: req.ip, scope: "tts" });
      if (!limit.allowed) return res.status(429).json({ success: false, code: "RATE_LIMITED" });
      const result = await orch.tts.synthesize(req.body || {});
      res.status(result.ok ? 200 : 503).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/voice/webrtc/offer", (req, res) => {
      if (!orch.flags.getFlags().VOICE_WEBRTC_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const created = webrtc.createSignalSession({ ...(req.body || {}), req });
      if (!created.ok) return res.status(400).json({ success: false, ...created });
      const offer = webrtc.setOffer(created.session.id, created.token, req.body?.sdp);
      res.json({ success: offer.ok, ...created, ...offer });
    });

    app.post("/api/orchestrator/voice/webrtc/answer", (req, res) => {
      if (!orch.flags.getFlags().VOICE_WEBRTC_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const result = webrtc.setAnswer(req.body?.sessionId, req.body?.token, req.body?.sdp);
      res.status(result.ok ? 200 : 401).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/voice/webrtc/ice", (req, res) => {
      if (!orch.flags.getFlags().VOICE_WEBRTC_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const result = webrtc.addIce(req.body?.sessionId, req.body?.token, req.body?.candidate);
      res.status(result.ok ? 200 : 401).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/phone/call", async (req, res) => {
      if (!orch.flags.getFlags().PHONE_ENABLED) return publicDisabled(res, "PHONE_PROVIDER_NOT_CONFIGURED");
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "ai.execute")) return;
      const result = await orch.phone.startOutbound({
        ...(req.body || {}),
        approved: Boolean(req.body?.approved),
      });
      res.status(result.ok ? 200 : 503).json({ success: Boolean(result.ok), ...result });
    });

    app.post("/api/orchestrator/phone/webhook", (req, res) => {
      const accepted = orch.acceptEvent({
        eventId: req.body?.eventId || req.headers["x-event-id"],
        payload: req.body,
        signature: req.headers["x-signature"] || req.body?.signature,
        timestamp: req.headers["x-timestamp"] || req.body?.timestamp,
        nonce: req.headers["x-nonce"] || req.body?.nonce,
        secret: process.env.TELEPHONY_WEBHOOK_SECRET,
        ip: req.ip,
      });
      if (!accepted.ok) return res.status(401).json({ success: false, ...accepted });
      if (accepted.duplicate) return res.json({ success: true, ...accepted });
      if (req.body?.callId && req.body?.type) {
        orch.phone.applyEvent(req.body.callId, req.body.type);
      }
      res.json({ success: true, ...accepted });
    });

    app.post("/api/orchestrator/phone/handoff", (req, res) => {
      if (!orch.flags.getFlags().ORCHESTRATOR_ENABLED) return publicDisabled(res);
      const result = orch.phone.handoff({
        conversationId: req.body?.conversationId,
        locale: req.body?.locale || req.body?.language || "de",
        reason: req.body?.reason,
        channel: req.body?.channel || "PHONE",
        extra: req.body || {},
      });
      res.json({ success: true, ...result });
    });

    app.get("/api/orchestrator/conversation/:id", (req, res) => {
      if (!orch.flags.getFlags().ORCHESTRATOR_ENABLED) return publicDisabled(res);
      const conversation = orch.conversations.getConversation(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, code: "NOT_FOUND" });
      res.json({ success: true, conversation });
    });

    app.get("/api/orchestrator/conversations/:id", (req, res) => {
      if (!orch.flags.getFlags().ORCHESTRATOR_ENABLED) return publicDisabled(res);
      const conversation = orch.conversations.getConversation(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, code: "NOT_FOUND" });
      res.json({ success: true, conversation });
    });

    app.get("/api/orchestrator/task/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const task = orch.tasks.getTask(req.params.id);
      if (!task) return res.status(404).json({ success: false, code: "NOT_FOUND" });
      res.json({ success: true, task });
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
      res.json({
        success: true,
        dashboard: orch.dashboard(),
        production: validateProduction(),
      });
    });
  },
};
