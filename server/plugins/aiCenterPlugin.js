const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const aiCenter = require("../lib/aiCenter");
const aiCenterAccess = require("../lib/aiCenterAccess");
const { can } = require("../lib/rbac");
const { createRateLimiter, getClientIp, publicErrorBody } = require("../lib/security");
const { logSecurityEvent } = require("../lib/securityLog");
const { logAudit } = require("../lib/coreAudit");

function requireAnyAdmin(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      const user = verifyToken(bearer);
      if (user.role === "admin") {
        req.user = user;
        return user;
      }
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ error: "Admin access required" });
  return null;
}

const CLOSED = Object.freeze({ providerCalled: false, executed: false, dryRun: true });

function sendAiResult(res, result) {
  if (result.error) return res.status(result.status || 400).json({ error: result.error, ...CLOSED });
  if (result.pendingApproval) return res.status(202).json(result);
  if (result.code === "CLARIFICATION_REQUIRED") return res.status(409).json(result);
  return res.status(200).json(result);
}

// Per account, not per address: several people can share an office address.
const requestBudget = createRateLimiter({ windowMs: 60 * 1000, max: 30, keyPrefix: "ai-center:" });

/**
 * The central route policy has already required a back-office session with
 * the route's permission. This layer adds the per-account budget, the audit
 * entry and the output check, and refuses to run if no session is attached.
 */
function actorOf(req, res) {
  const actor = req.adminUser;
  if (!actor || !actor.id) {
    res.status(401).json({ success: false, errorKey: "admin.auth.required" });
    return null;
  }
  if (requestBudget(req, { key: String(actor.id) })) {
    logSecurityEvent({
      type: "api_rate_limited",
      success: false,
      ip: getClientIp(req),
      path: req.routePath,
      userId: actor.id,
      role: actor.role,
      detail: { scope: "ai_center" },
    });
    res.status(429).json(publicErrorBody("security.rateLimited"));
    return null;
  }
  return actor;
}

function record(req, actor, operation, outcome, metadata = {}) {
  // This entry is the audit record of the request; the generic per-request entry is not needed.
  req.auditHandled = true;
  logAudit({
    userId: actor.id,
    userEmail: actor.email,
    role: actor.role,
    userAgent: req.headers["user-agent"] || null,
    action: `ai_center.${operation}`,
    entityType: "ai_center",
    entityId: metadata.entityId || null,
    result: outcome,
    ip: getClientIp(req),
    // What was asked is not copied into the audit log; who asked for which operation is.
    metadata: { role: actor.role, requestId: req.requestId || null, ...metadata },
  });
}

function operationRoute(operation, schema, run) {
  return (req, res) => {
    const actor = actorOf(req, res);
    if (!actor) return undefined;

    const input = aiCenterAccess.validateInput(schema, req.body || {});
    if (input.error) {
      record(req, actor, operation, "rejected", { reason: "invalid_input", field: input.error });
      return res.status(400).json({ success: false, errorKey: "aiCenter.invalidInput", field: input.error, ...CLOSED });
    }

    let result;
    try {
      result = run(input.value, actor);
    } catch (error) {
      console.error("AI center error:", operation, error && (error.code || error.name));
      record(req, actor, operation, "error");
      return res.status(500).json({ error: "AI adapter error", ...CLOSED });
    }

    const output = aiCenterAccess.checkOutput(result);
    if (!output.ok) {
      logSecurityEvent({
        type: "ai_permission_violation",
        success: false,
        ip: getClientIp(req),
        path: req.routePath,
        userId: actor.id,
        role: actor.role,
        detail: { operation, reason: output.reason },
      });
      record(req, actor, operation, "blocked", { reason: `output_${output.reason}` });
      return res.status(500).json({ success: false, errorKey: "aiCenter.unsafeOutput", ...CLOSED });
    }

    record(req, actor, operation, result.error ? "refused" : result.pendingApproval ? "pending_approval" : "success", {
      code: result.code || null,
      approvalId: result.approval?.id || null,
      jobId: result.jobId || null,
    });
    return sendAiResult(res, result);
  };
}

module.exports = {
  register(app) {
    if (!aiCenter.isEnabled()) {
      console.log("AI center disabled (BUZZARD_AI_CENTER=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/ai-center/sessions", (req, res) => {
      const actor = actorOf(req, res);
      if (!actor) return undefined;
      const input = aiCenterAccess.validateInput("session", req.body || {});
      if (input.error) {
        record(req, actor, "session_create", "rejected", { reason: "invalid_input", field: input.error });
        return res.status(400).json({ success: false, errorKey: "aiCenter.invalidInput", field: input.error });
      }
      const result = aiCenter.createSession(input.value, { ownerUserId: actor.id });
      record(req, actor, "session_create", "success", { entityId: String(result.sessionId) });
      return res.status(201).json(result);
    });

    app.get("/api/ai-center/sessions/:token", (req, res) => {
      const actor = actorOf(req, res);
      if (!actor) return undefined;
      const token = aiCenterAccess.validateSessionToken(req.params.token);
      const result = token ? aiCenter.getSessionByToken(token) : { error: "Session not found", status: 404 };
      // Someone else's conversation looks like one that does not exist, unless the caller supervises AI work.
      const mine = !result.error && (result.session.owner_user_id === actor.id || can(actor.role, "ai.assign"));
      if (!mine) return res.status(404).json({ error: "Session not found" });
      return res.json(result);
    });

    app.post(
      "/api/ai-center/chat",
      operationRoute("chat", "chat", (input, actor) => aiCenter.chat(input, { ownerUserId: actor.id }))
    );
    app.post("/api/ai-center/recommend", operationRoute("recommend", "recommend", (input) => aiCenter.recommend(input)));
    app.post("/api/ai-center/product-copy", operationRoute("product_copy", "productCopy", (input) => aiCenter.generateProductCopy(input)));
    app.post("/api/ai-center/translate", operationRoute("translate", "translate", (input) => aiCenter.translate(input)));
    app.post(
      "/api/ai-center/review-sentiment",
      operationRoute("review_sentiment", "reviewSentiment", (input) => aiCenter.analyzeReviewSentiment(input))
    );
    app.post("/api/ai-center/smart-search", operationRoute("smart_search", "smartSearch", (input) => aiCenter.smartSearch(input)));

    app.post("/api/ai-center/jobs/:id/retry", (req, res) => {
      const actor = actorOf(req, res);
      if (!actor) return undefined;
      const jobId = aiCenterAccess.validateJobId(req.params.id);
      if (!jobId) {
        record(req, actor, "job_retry", "rejected", { reason: "invalid_input", field: "id" });
        return res.status(400).json({ success: false, errorKey: "aiCenter.invalidInput", field: "id", ...CLOSED });
      }
      const result = aiCenter.retryJob(jobId);
      record(req, actor, "job_retry", result.error ? "refused" : "approval_required", { entityId: String(jobId) });
      if (result.error) return res.status(result.status || 404).json({ error: result.error, ...CLOSED });
      // A retry never runs the job: it stays behind the human approval.
      return res.status(result.status || 409).json(result);
    });

    app.get("/api/admin/ai-center/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(aiCenter.getAiCenterOverview());
    });

    app.get("/api/admin/ai-center/jobs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(aiCenter.listJobs());
    });
  },
};
