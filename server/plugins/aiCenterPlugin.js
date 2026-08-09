const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const aiCenter = require("../lib/aiCenter");

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

module.exports = {
  register(app) {
    if (!aiCenter.isEnabled()) {
      console.log("AI center disabled (BUZZARD_AI_CENTER=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/ai-center/sessions", (req, res) => {
      const result = aiCenter.createSession(req.body || {});
      return res.status(201).json(result);
    });

    app.get("/api/ai-center/sessions/:token", (req, res) => {
      const result = aiCenter.getSessionByToken(req.params.token);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/ai-center/chat", (req, res) => {
      try {
        const result = aiCenter.chat(req.body || {});
        if (result.error) return res.status(result.status || 400).json({ error: result.error });
        return res.json(result);
      } catch {
        return res.status(500).json({ error: "AI adapter error" });
      }
    });

    app.post("/api/ai-center/recommend", (req, res) => {
      return res.json(aiCenter.recommend(req.body || {}));
    });

    app.post("/api/ai-center/product-copy", (req, res) => {
      const result = aiCenter.generateProductCopy(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/ai-center/translate", (req, res) => {
      const result = aiCenter.translate(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/ai-center/review-sentiment", (req, res) => {
      const result = aiCenter.analyzeReviewSentiment(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/ai-center/smart-search", (req, res) => {
      const result = aiCenter.smartSearch(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/ai-center/jobs/:id/retry", (req, res) => {
      const result = aiCenter.retryJob(req.params.id);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
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
