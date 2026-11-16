const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_AI_CENTER !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function sessionToken() {
  return crypto.randomUUID();
}

function clean(value, max = 4000) {
  return String(value ?? "").slice(0, max);
}

function detectIntent(text) {
  const sample = String(text).toLowerCase();
  if (/return|refund|rückgabe|iade|retour/.test(sample)) return "returns";
  if (/order|bestellung|sipariş|lieferung|delivery|kargo/.test(sample)) return "order_status";
  if (/price|preis|fiyat|discount|rabatt|indirim/.test(sample)) return "pricing";
  if (/recommend|empfehl|öner|suggest/.test(sample)) return "recommendation";
  if (/product|produkt|ürün/.test(sample)) return "product_info";
  if (/payment|zahlung|ödeme/.test(sample)) return "payment";
  return "general";
}

function aiAdapter({ task, input, language = "de" }) {
  const provider = process.env.AI_PROVIDER || "adapter";

  if (task === "translate") {
    return { text: `[${language}] ${input}`, provider, demo: true };
  }
  if (task === "sentiment") {
    const negative = /bad|schlecht|kötü|problem|terrible|schrecklich/.test(String(input).toLowerCase());
    return { label: negative ? "negative" : "positive", score: 0.5, provider, demo: true };
  }
  if (task === "search") {
    return { normalized: String(input).trim(), intent: detectIntent(input), provider, demo: true };
  }
  if (task === "product_copy") {
    return {
      title: "AI Product Draft",
      description: `Product description draft based on: ${clean(input, 1000)}`,
      provider,
      demo: true,
    };
  }
  if (task === "support") {
    return {
      answer: `AI support draft for ${detectIntent(input)}: ${clean(input, 500)}`,
      needsHuman: /complaint|lawyer|chargeback|fraud|danger/.test(String(input).toLowerCase()),
      provider,
      demo: true,
    };
  }

  return { answer: `AI assistant draft: ${clean(input, 1000)}`, provider, demo: true };
}

function createSession(body = {}) {
  const token = sessionToken();
  const result = db
    .prepare(`
      INSERT INTO aictr_sessions(session_token, customer_id, language, channel)
      VALUES(?,?,?,?)
    `)
    .run(
      token,
      body.customerId || body.customer_id || null,
      body.language || "de",
      body.channel || "web"
    );

  return {
    sessionToken: token,
    sessionId: result.lastInsertRowid,
    created: true,
  };
}

function getSessionByToken(token) {
  const session = db.prepare("SELECT * FROM aictr_sessions WHERE session_token = ?").get(token);
  if (!session) return { error: "Session not found", status: 404 };

  return {
    session,
    messages: db
      .prepare("SELECT * FROM aictr_messages WHERE session_id = ? ORDER BY id")
      .all(session.id),
  };
}

function chat(body = {}) {
  const text = clean(body.message);
  const { decideAiAction } = require("./aiCenterAuthority");
  const preview = decideAiAction({ surface: "support", text, action: body.action });
  if (!text && !preview.commercial) return { error: "Message required", status: 400, providerCalled: false, executed: false, dryRun: true };
  if (preview.commercial) {
    const { holdCommercialAiAction } = require("./aiCenterAuthority");
    const { peripheralDeps } = require("./controlCenterJobAdmission");
    return holdCommercialAiAction({
      surface: "support",
      text,
      action: body.action,
      actor: "ai_center_support",
      subjectId: body.orderNumber || body.order_number || null,
      deps: peripheralDeps(),
    });
  }

  let session = body.sessionToken
    ? db.prepare("SELECT * FROM aictr_sessions WHERE session_token = ?").get(body.sessionToken)
    : null;

  if (!session) {
    const created = createSession(body);
    session = db.prepare("SELECT * FROM aictr_sessions WHERE id = ?").get(created.sessionId);
  }

  const intent = detectIntent(text);
  db.prepare(`
    INSERT INTO aictr_messages(session_id, role, intent, content)
    VALUES(?,?,?,?)
  `).run(session.id, "user", intent, text);

  db.prepare(`
    INSERT INTO aictr_messages(session_id, role, intent, content, model, prompt_version)
    VALUES(?,?,?,?,?,?)
  `).run(session.id, "assistant", intent, preview.answer, "none", "v1");

  db.prepare(`
    INSERT INTO aictr_audit(session_id, customer_id, action, intent, risk_level, human_handoff, metadata_json)
    VALUES(?,?,?,?,?,?,?)
  `).run(
    session.id,
    session.customer_id,
    "chat",
    intent,
    "low",
    0,
    JSON.stringify({ providerCalled: false })
  );

  return {
    ...preview,
    sessionToken: session.session_token,
    intent,
    humanHandoff: false,
  };
}

function recommend(body = {}) {
  const text = clean(body.query || body.context);
  const { decideAiAction, holdCommercialAiAction } = require("./aiCenterAuthority");
  const decision = decideAiAction({ surface: "recommend", text, action: body.action });
  if (!text && !decision.commercial) {
    return { error: "Query required", status: 400, providerCalled: false, executed: false, dryRun: true };
  }
  if (decision.commercial) {
    const { peripheralDeps } = require("./controlCenterJobAdmission");
    return holdCommercialAiAction({
      surface: "recommend",
      text,
      action: body.action,
      actor: "ai_center_recommend",
      subjectId: body.productId || body.product_id || null,
      deps: peripheralDeps(),
    });
  }
  return {
    ...decision,
    intent: "recommendation",
    recommendations: [],
    note: "Product suggestions stay informational. Stock purchase and order creation stay closed.",
  };
}

function holdAiJob(jobType, entityType, entityId) {
  const crypto = require("crypto");
  const { admitPeripheralAutomation, peripheralDeps, PERIPHERAL_AUTOMATION_SOURCES } = require("./controlCenterJobAdmission");
  const admitted = admitPeripheralAutomation({
    source: PERIPHERAL_AUTOMATION_SOURCES.AI_CENTER,
    jobType,
    actor: "ai_center",
    subjectId: entityId || null,
    deps: peripheralDeps(),
  });
  if (!admitted.ok) {
    return { error: admitted.message, code: admitted.code, status: admitted.status, executed: false, dryRun: true };
  }
  const digest = crypto.createHash("sha256").update(`${jobType}:${entityId || ""}`).digest("hex").slice(0, 16);
  const result = db.prepare(`
    INSERT INTO aictr_jobs(
      job_type, entity_type, entity_id, input_json, output_json, status, model
    ) VALUES(?,?,?,?,NULL,'APPROVAL_REQUIRED','held')
  `).run(
    jobType,
    entityType,
    entityId || "",
    JSON.stringify({ digest, dryRun: true, approvalId: admitted.approval.id, jobId: admitted.jobId })
  );
  return {
    ok: true,
    executed: false,
    dryRun: true,
    pendingApproval: true,
    status: 202,
    jobId: result.lastInsertRowid,
    approval: admitted.approval,
  };
}

function decideContent(text, action, surface) {
  const { decideAiAction } = require("./aiCenterAuthority");
  return decideAiAction({ surface, text, action });
}

function contentGate(surface, text, action, actor, subjectId, deps) {
  const { decideAiAction, holdCommercialAiAction } = require("./aiCenterAuthority");
  const decision = decideAiAction({ surface, text, action });
  if (decision.commercial) {
    const resolved = deps || require("./controlCenterJobAdmission").peripheralDeps();
    return holdCommercialAiAction({
      surface,
      text,
      action,
      actor,
      subjectId,
      deps: resolved,
    });
  }
  if (!decision.ok) return decision;
  return null;
}

function withCommerceFlags(result) {
  return {
    ...result,
    providerCalled: false,
    executed: false,
    dryRun: true,
    orderStarted: false,
    paymentStarted: false,
    cancelStarted: false,
    refundStarted: false,
    purchaseStarted: false,
  };
}

function generateProductCopy(body = {}) {
  if (!body.product) {
    return { error: "Product data required", status: 400, providerCalled: false, executed: false, dryRun: true };
  }
  const text = typeof body.product === "string"
    ? body.product
    : [body.product.name, body.product.description, body.product.short_description].filter(Boolean).join(" ");
  const gated = contentGate("product_copy", text, body.action, "ai_center_product_copy", body.productSku || body.product_sku || null, body.deps);
  if (gated) return withCommerceFlags(gated);
  if (body.deps) return withCommerceFlags(decideContent(text, body.action, "product_copy"));
  return withCommerceFlags(holdAiJob("product_copy", "product", String(body.productSku || body.product_sku || "")));
}

function translate(body = {}) {
  if (!body.text || !body.targetLanguage) {
    return { error: "Text and target language required", status: 400, providerCalled: false, executed: false, dryRun: true };
  }
  const gated = contentGate("translate", body.text, body.action, "ai_center_translate", body.entityId || body.entity_id || null, body.deps);
  if (gated) return withCommerceFlags(gated);
  if (body.deps) return withCommerceFlags(decideContent(body.text, body.action, "translate"));
  return withCommerceFlags(holdAiJob(
    "translation",
    body.entityType || body.entity_type || "content",
    String(body.entityId || body.entity_id || "")
  ));
}

function analyzeReviewSentiment(body = {}) {
  if (!body.review) {
    return { error: "Review required", status: 400, providerCalled: false, executed: false, dryRun: true };
  }
  const gated = contentGate("review_sentiment", body.review, body.action, "ai_center_review", body.reviewId || body.review_id || null, body.deps);
  if (gated) return withCommerceFlags(gated);
  if (body.deps) return withCommerceFlags(decideContent(body.review, body.action, "review_sentiment"));
  return withCommerceFlags(holdAiJob("review_sentiment", "review", String(body.reviewId || body.review_id || "")));
}

function smartSearch(body = {}) {
  const text = clean(body.query);
  const { decideAiAction, holdCommercialAiAction } = require("./aiCenterAuthority");
  const decision = decideAiAction({ surface: "smart_search", text, action: body.action });
  if (!text && !decision.commercial) {
    return { error: "Query required", status: 400, providerCalled: false, executed: false, dryRun: true };
  }
  if (decision.commercial) {
    const { peripheralDeps } = require("./controlCenterJobAdmission");
    return holdCommercialAiAction({
      surface: "smart_search",
      text,
      action: body.action,
      actor: "ai_center_smart_search",
      subjectId: body.productId || body.product_id || null,
      deps: peripheralDeps(),
    });
  }
  return {
    ...decision,
    intent: "product_info",
    filters: Array.isArray(body.filters) ? body.filters.slice(0, 8) : [],
    productIds: [],
  };
}

function retryJob(jobId) {
  const job = db.prepare("SELECT * FROM aictr_jobs WHERE id = ?").get(jobId);
  if (!job) return { error: "AI job not found", status: 404 };
  if (job.status === "queued" || job.status === "completed") {
    db.prepare("UPDATE aictr_jobs SET status = 'refused', completed_at = NULL WHERE id = ?").run(job.id);
  }
  return { ok: false, code: "APPROVAL_REQUIRED", executed: false, dryRun: true, status: 409 };
}

function listJobs() {
  return db.prepare("SELECT * FROM aictr_jobs ORDER BY id DESC LIMIT 500").all();
}

function getAiCenterOverview() {
  return {
    sessions: db.prepare("SELECT COUNT(*) n FROM aictr_sessions").get().n,
    messages: db.prepare("SELECT COUNT(*) n FROM aictr_messages").get().n,
    jobs: db.prepare("SELECT COUNT(*) n FROM aictr_jobs").get().n,
    completedJobs: db.prepare("SELECT COUNT(*) n FROM aictr_jobs WHERE status = 'completed'").get().n,
    handoffs: db.prepare("SELECT COUNT(*) n FROM aictr_audit WHERE human_handoff = 1").get().n,
    prompts: db.prepare("SELECT COUNT(*) n FROM aictr_prompt_versions WHERE active = 1").get().n,
  };
}

function getAiCenterStatus() {
  const overview = getAiCenterOverview();
  return {
    version: "2.8.0",
    enabled: isEnabled(),
    provider: process.env.AI_PROVIDER || "adapter",
    totals: {
      sessions: overview.sessions,
      messages: overview.messages,
      jobs: overview.jobs,
      completedJobs: overview.completedJobs,
      handoffs: overview.handoffs,
      prompts: overview.prompts,
      auditEvents: db.prepare("SELECT COUNT(*) n FROM aictr_audit").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  createSession,
  getSessionByToken,
  chat,
  recommend,
  generateProductCopy,
  translate,
  analyzeReviewSentiment,
  smartSearch,
  retryJob,
  listJobs,
  getAiCenterOverview,
  getAiCenterStatus,
};
