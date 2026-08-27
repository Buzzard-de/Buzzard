const {
  fetchOrchestrator,
  getOrchestratorStatus,
  isOrchestratorConfigured,
} = require("../lib/orchestratorBridge");

module.exports = {
  register(app) {
    app.get("/api/orchestrator/status", async (_req, res) => {
      res.json(await getOrchestratorStatus());
    });

    app.get("/api/orchestrator/agents", async (_req, res) => {
      if (!isOrchestratorConfigured()) {
        return res.status(503).json({ error: "orchestrator_not_configured" });
      }
      const result = await fetchOrchestrator("/agents");
      if (!result.ok) {
        return res.status(502).json({ error: "orchestrator_unreachable", detail: result });
      }
      return res.json(result.body);
    });

    app.get("/api/orchestrator/tasks", async (req, res) => {
      if (!isOrchestratorConfigured()) {
        return res.status(503).json({ error: "orchestrator_not_configured" });
      }
      const qs = new URLSearchParams();
      if (req.query.status) qs.set("status", String(req.query.status));
      if (req.query.limit) qs.set("limit", String(req.query.limit));
      const suffix = qs.toString() ? `?${qs}` : "";
      const result = await fetchOrchestrator(`/tasks${suffix}`);
      if (!result.ok) {
        return res.status(502).json({ error: "orchestrator_unreachable", detail: result });
      }
      return res.json(result.body);
    });
  },
};
