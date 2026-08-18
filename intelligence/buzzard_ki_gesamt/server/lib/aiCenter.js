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
  if (!text) return { error: "Message required", status: 400 };

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

  const output = aiAdapter({ task: "support", input: text, language: session.language });
  db.prepare(`
    INSERT INTO aictr_messages(session_id, role, intent, content, model, prompt_version)
    VALUES(?,?,?,?,?,?)
  `).run(session.id, "assistant", intent, output.answer, output.provider, "v1");

  const handoff = output.needsHuman ? 1 : 0;
  db.prepare(`
    INSERT INTO aictr_audit(session_id, customer_id, action, intent, risk_level, human_handoff, metadata_json)
    VALUES(?,?,?,?,?,?,?)
  `).run(
    session.id,
    session.customer_id,
    "chat",
    intent,
    handoff ? "medium" : "low",
    handoff,
    JSON.stringify({ provider: output.provider })
  );

  return {
    sessionToken: session.session_token,
    intent,
    answer: output.answer,
    humanHandoff: Boolean(handoff),
    provider: output.provider,
  };
}

function recommend(body = {}) {
  const text = clean(body.query || body.context);
  const output = aiAdapter({ task: "search", input: text, language: body.language || "de" });
  return {
    intent: output.intent,
    query: output.normalized,
    recommendations: [],
    note: "Connect product catalog/search service to return live ranked products.",
  };
}

function generateProductCopy(body = {}) {
  if (!body.product) return { error: "Product data required", status: 400 };

  const input = JSON.stringify(body.product);
  const output = aiAdapter({ task: "product_copy", input, language: body.language || "de" });
  const result = db
    .prepare(`
      INSERT INTO aictr_jobs(
        job_type, entity_type, entity_id, input_json, output_json, status, model, completed_at
      )
      VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    `)
    .run(
      "product_copy",
      "product",
      String(body.productSku || body.product_sku || ""),
      input,
      JSON.stringify(output),
      "completed",
      output.provider
    );

  return { jobId: result.lastInsertRowid, ...output };
}

function translate(body = {}) {
  if (!body.text || !body.targetLanguage) {
    return { error: "Text and target language required", status: 400 };
  }

  const output = aiAdapter({
    task: "translate",
    input: body.text,
    language: body.targetLanguage,
  });
  const result = db
    .prepare(`
      INSERT INTO aictr_jobs(
        job_type, entity_type, entity_id, input_json, output_json, status, model, completed_at
      )
      VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    `)
    .run(
      "translation",
      body.entityType || body.entity_type || "content",
      String(body.entityId || body.entity_id || ""),
      JSON.stringify(body),
      JSON.stringify(output),
      "completed",
      output.provider
    );

  return { jobId: result.lastInsertRowid, ...output };
}

function analyzeReviewSentiment(body = {}) {
  if (!body.review) return { error: "Review required", status: 400 };

  const output = aiAdapter({ task: "sentiment", input: body.review });
  const result = db
    .prepare(`
      INSERT INTO aictr_jobs(
        job_type, entity_type, entity_id, input_json, output_json, status, model, completed_at
      )
      VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    `)
    .run(
      "review_sentiment",
      "review",
      String(body.reviewId || body.review_id || ""),
      JSON.stringify(body),
      JSON.stringify(output),
      "completed",
      output.provider
    );

  return { jobId: result.lastInsertRowid, ...output };
}

function smartSearch(body = {}) {
  if (!body.query) return { error: "Query required", status: 400 };

  const output = aiAdapter({ task: "search", input: body.query, language: body.language || "de" });
  return { ...output, filters: [], productIds: [] };
}

function retryJob(jobId) {
  const job = db.prepare("SELECT * FROM aictr_jobs WHERE id = ?").get(jobId);
  if (!job) return { error: "AI job not found", status: 404 };

  db.prepare("UPDATE aictr_jobs SET status = 'queued', completed_at = NULL WHERE id = ?").run(job.id);
  return { ok: true, status: "queued" };
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
