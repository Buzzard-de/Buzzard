const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const orch = require("../lib/orchestrator");
const webrtc = require("../lib/orchestrator/providers/webrtc");
const openaiRealtime = require("../lib/orchestrator/providers/openaiRealtime");
const twilioIce = require("../lib/orchestrator/providers/twilioIce");
const { validateProduction } = require("../lib/orchestrator/productionValidator");
const { checkLimit } = require("../lib/orchestrator/rateLimit");
const embodied = require("../lib/orchestrator/embodied");

function publicDisabled(res, code = "ORCHESTRATOR_DISABLED") {
  return res.status(503).json({ success: false, code, message: orch.userFacingError(code) });
}

function honestHealth(status, extra = {}) {
  const live = status === "READY";
  return {
    success: true,
    status,
    healthy: live,
    live,
    ...extra,
  };
}

module.exports = {
  register(app) {
    app.get("/api/health/orchestrator", (_req, res) => {
      const production = validateProduction();
      const embodiedReport = embodied.validator.validateEmbodied();
      res.json({
        success: true,
        orchestrator: orch.status(),
        production,
        embodied: embodiedReport,
        services: {
          orchestrator: production.flags.ORCHESTRATOR_ENABLED ? "READY" : "NOT_CONFIGURED",
          stt: embodiedReport.providerReady.stt,
          tts: embodiedReport.providerReady.tts,
          avatar: embodiedReport.providerReady.avatar,
          video: embodiedReport.providerReady.video,
          webrtc: embodiedReport.providerReady.webrtc,
          telephony: embodiedReport.providerReady.telephony,
        },
      });
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

    app.post("/api/orchestrator/voice/webrtc/stats", (req, res) => {
      if (!orch.flags.getFlags().VOICE_WEBRTC_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const result = webrtc.reportMediaStats(req.body?.sessionId, req.body?.token, req.body?.stats || req.body || {});
      res.status(result.ok ? 200 : 401).json({ success: result.ok, ...result });
    });

    app.get("/api/orchestrator/voice/webrtc/ice-servers", async (_req, res) => {
      if (!orch.flags.getFlags().VOICE_WEBRTC_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const minted = await twilioIce.mintIceServers();
      if (!minted.ok) {
        const ice = webrtc.iceConfig();
        return res.status(503).json({
          success: false,
          ...minted,
          fallbackUrls: ice.urls,
          mediaConnected: false,
        });
      }
      res.json({ success: true, iceServers: minted.iceServers, ttl: minted.ttl, provider: minted.provider });
    });

    app.post("/api/orchestrator/voice/realtime/session", async (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const result = await openaiRealtime.createEphemeralSession({
        language: req.body?.language,
        userId: req.body?.userId || req.user?.id,
        conversationId: req.body?.conversationId,
      });
      const payload = { success: result.ok, ...result };
      res.status(result.ok ? 200 : 503).json(payload);
    });

    app.post("/api/orchestrator/voice/realtime/:id/transcript", async (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      const result = await openaiRealtime.handleUserTranscript(req.params.id, req.body || {});
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/voice/realtime/:id/barge-in", (req, res) => {
      if (!orch.flags.getFlags().VOICE_ENABLED) return publicDisabled(res, "VOICE_DISABLED");
      res.json({ success: true, ...openaiRealtime.bargeIn(req.params.id) });
    });

    app.get("/api/orchestrator/phone/twiml/stream", (_req, res) => {
      const stream = orch.telephony.mediaStreamTwiml();
      if (!stream.ok) return res.status(503).json({ success: false, ...stream });
      res.type("text/xml").send(stream.twiml);
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
        embodied: embodied.validator.validateEmbodied(),
        inspect: require("../lib/orchestrator/providers/health").inspectAll(),
        matrix: embodied.productionMatrix.productionMatrix(),
        claims: embodied.livePipeline.liveClaims(),
        credentials: embodied.credentialDiscovery.discoverCredentials().keys,
        activation: embodied.activation.evaluateActivation(),
      });
    });

    app.get("/api/health/avatar", (_req, res) => {
      const report = embodied.validator.validateEmbodied();
      res.json(
        honestHealth(report.providerReady.avatar, {
          code: report.realAvatarActive ? "OK" : "BLOCKED_BY_PROVIDER_CONFIGURATION",
          liveAvatar: Boolean(report.realAvatarActive),
          fallback: report.fallback,
        })
      );
    });

    app.get("/api/health/voice", (_req, res) => {
      const report = embodied.validator.validateEmbodied();
      const live = Boolean(report.realSttActive && report.realTtsActive);
      res.json(
        honestHealth(live ? "READY" : report.providerReady.stt, {
          stt: report.providerReady.stt,
          tts: report.providerReady.tts,
          openaiRealtime: require("../lib/orchestrator/providers/openaiRealtime").inspect(),
          liveStt: Boolean(report.realSttActive),
          liveTts: Boolean(report.realTtsActive),
          code: live ? "OK" : "BLOCKED_BY_PROVIDER_CONFIGURATION",
        })
      );
    });

    app.get("/api/health/webrtc", (_req, res) => {
      const ice = embodied.activation.iceStatus();
      const status = ice === "PASS" ? "READY" : ice === "PARTIAL" ? "DEGRADED" : "NOT_CONFIGURED";
      res.json(
        honestHealth(status, {
          ice,
          mediaConnected: false,
          twilioIce: require("../lib/orchestrator/providers/twilioIce").inspect(),
          code: ice === "PASS" ? "OK" : "WEBRTC_ICE_NOT_CONFIGURED",
        })
      );
    });

    app.get("/api/health/phone", (_req, res) => {
      const report = embodied.validator.validateEmbodied();
      res.json(
        honestHealth(report.providerReady.telephony, {
          livePhone: Boolean(report.realPhoneActive),
          code: report.realPhoneActive ? "OK" : "PHONE_PROVIDER_NOT_CONFIGURED",
        })
      );
    });

    app.get("/api/health/providers", (_req, res) => {
      const report = embodied.validator.validateEmbodied();
      const claims = embodied.livePipeline.liveClaims();
      res.json({
        success: true,
        credentials: embodied.credentialDiscovery.discoverCredentials().keys,
        claims,
        services: report.providerReady,
        healthy: Object.values(claims).some(Boolean),
        code: report.code,
      });
    });

    app.get("/api/health/production-readiness", (_req, res) => {
      const matrix = embodied.productionMatrix.productionMatrix();
      const report = embodied.validator.validateEmbodied();
      res.json({
        success: true,
        healthy: matrix.activation === "LIVE_VALIDATED",
        productionReady: report.productionReady,
        matrix,
        claims: embodied.livePipeline.liveClaims(),
        activation: embodied.activation.evaluateActivation(),
        liveCriteria: embodied.liveCriteriaSnapshot.overallLiveCriteria(
          embodied.liveCriteriaSnapshot.liveCriteriaSnapshot()
        ),
        checklist: embodied.externalActivationChecklist.externalActivationChecklist(),
        code: matrix.activation,
      });
    });

    app.get("/api/health/embodied", (_req, res) => {
      const report = embodied.validator.validateEmbodied();
      res.json({
        success: true,
        embodied: report,
        avatar: embodied.avatarProvider.health(),
        liveAvatar: Boolean(report.realAvatarActive),
        liveVideo: false,
        services: {
          orchestrator: report.flags.ORCHESTRATOR_ENABLED ? "READY" : "NOT_CONFIGURED",
          stt: report.providerReady.stt,
          tts: report.providerReady.tts,
          avatar: report.providerReady.avatar,
          video: report.providerReady.video,
          webrtc: report.providerReady.webrtc,
          telephony: report.providerReady.telephony,
          world: report.codeReady.world,
          behavior: report.codeReady.behavior,
          security: report.codeReady.security,
          approval: report.codeReady.approval,
        },
      });
    });

    app.post("/api/orchestrator/embodied/session", (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      const created = embodied.runtime.createSession({
        userId: req.body?.userId || req.user?.id,
        language: req.body?.language || "de",
        debug: req.body?.debug,
      });
      res.status(created.ok ? 200 : 503).json({ success: created.ok, ...created });
    });

    app.get("/api/orchestrator/embodied/session/:id", (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      const session = embodied.runtime.getSession(req.params.id);
      if (!session) return res.status(404).json({ success: false, code: "SESSION_NOT_FOUND" });
      res.json({ success: true, session });
    });

    app.get("/api/orchestrator/embodied/session/:id/world", (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      const snap = embodied.runtime.worldSnapshot(req.params.id, req.query?.camera);
      res.status(snap.ok ? 200 : 404).json({ success: snap.ok, ...snap });
    });

    app.post("/api/orchestrator/embodied/session/:id/turn", async (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      const result = await embodied.runtime.handleTurn(req.params.id, req.body || {});
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/embodied/session/:id/realtime", async (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      const result = await embodied.livePipeline.runRealtimeTurn(req.params.id, req.body || {});
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/embodied/session/:id/presence", (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      const result = embodied.runtime.setPresence(req.params.id, req.body || {});
      res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/embodied/session/:id/handoff", (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      const result = embodied.runtime.handoff(req.params.id, req.body || {});
      res.json({ success: result.ok, ...result });
    });

    app.post("/api/orchestrator/embodied/session/:id/idle", (req, res) => {
      if (!orch.flags.getFlags().EMBODIED_AI_ENABLED) return publicDisabled(res, "EMBODIED_AI_DISABLED");
      res.json({ success: true, ...embodied.runtime.idleTick(req.params.id) });
    });
  },
};
