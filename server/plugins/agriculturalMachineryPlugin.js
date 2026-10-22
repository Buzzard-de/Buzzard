const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { getEngine } = require("../lib/agriculturalMachinery");
const isolation = require("../lib/machineryDomainKit/isolation");
const { ensureEngineSeeded } = require("../lib/machineryDomainKit/seedMocks");

function publicError(res, status, code, message) {
  return res.status(status).json({ ok: false, error: code, message });
}

module.exports = {
  register(app) {
    const engine = getEngine();
    ensureEngineSeeded("agricultural").catch((error) => {
      console.warn("agricultural mock seed skipped:", error.message);
    });

    app.get("/api/agricultural-machinery/health", (_req, res) => {
      return res.json({ ok: true, ...engine.health() });
    });

    app.get("/api/agricultural-machinery/taxonomy", (req, res) => {
      const language = String(req.query.lang || "de").slice(0, 2);
      return res.json({
        ok: true,
        domain: "agricultural",
        shopCategoryId: engine.taxonomy.shopCategoryId,
        validation: engine.taxonomy.validation,
        categories: engine.taxonomy.list().map((category) => ({
          id: category.id,
          parentId: category.parentId,
          slug: category.slug,
          shopCategoryId: category.shopCategoryId,
          name: engine.taxonomy.localize(category, language),
          names: category.names,
          synonyms: category.synonyms,
        })),
      });
    });

    app.get("/api/agricultural-machinery/search", (req, res) => {
      const scope = isolation.assertAgriculturalScope({
        categoryId: req.query.categoryId || "cat-20",
        domain: "agricultural",
      });
      if (!scope.ok) return res.status(400).json({ ok: false, isolation: scope });
      return res.json({
        ok: true,
        ...engine.search({
          q: req.query.q,
          oem: req.query.oem,
          manufacturer: req.query.manufacturer,
          modelName: req.query.model,
          modelCode: req.query.modelCode,
          serialNumber: req.query.serial,
          year: req.query.year ? Number(req.query.year) : undefined,
          ptoSpeed: req.query.pto,
          thread: req.query.thread,
          hitch: req.query.hitch,
          categoryId: req.query.categoryId,
          machineId: req.query.machineId,
          page: req.query.page,
          pageSize: req.query.pageSize,
        }),
      });
    });

    app.get("/api/agricultural-machinery/machines", (req, res) => {
      const q = String(req.query.q || "").toLowerCase();
      const items = engine.listMachines().filter((machine) => {
        if (!q) return true;
        return `${machine.manufacturer} ${machine.modelName} ${machine.modelCode}`.toLowerCase().includes(q);
      });
      return res.json({ ok: true, items, total: items.length });
    });

    app.get("/api/agricultural-machinery/machines/:id", (req, res) => {
      const machine = engine.getMachine(req.params.id);
      if (!machine) return publicError(res, 404, "unknown_machine", "Machine not found");
      return res.json({ ok: true, machine });
    });

    app.post("/api/agricultural-machinery/compatibility", (req, res) => {
      const body = req.body || {};
      const scope = isolation.assertAgriculturalScope({
        categoryId: body.categoryId || "cat-20",
        domain: "agricultural",
      });
      if (!scope.ok) return res.status(400).json({ ok: false, isolation: scope });
      return res.json({ ok: true, decision: engine.evaluate(body) });
    });

    app.get("/api/agricultural-machinery/offers", (req, res) => {
      if (!req.query.partId && !req.query.oem) {
        return res.json({ ok: true, items: [], status: "NOT_CONFIGURED" });
      }
      let partId = req.query.partId;
      if (!partId && req.query.oem) partId = engine.findPartsByNumber(req.query.oem, req.query.manufacturer)[0]?.id;
      if (!partId) return res.json({ ok: true, items: [], status: "UNKNOWN" });
      return res.json({ ok: true, ...engine.rankOffers({ partId, ...req.query }) });
    });

    app.get("/api/agricultural-machinery/integrations", (_req, res) => {
      return res.json({ ok: true, connectors: engine.registry.list() });
    });

    app.get("/api/admin/agricultural-machinery/overview", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ ok: true, ...engine.health() });
    });

    app.get("/api/admin/agricultural-machinery/jobs", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ ok: true, jobs: engine.listJobs() });
    });

    app.post("/api/admin/agricultural-machinery/import", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = await engine.importFrom(req.body?.connectorId || "mock-ag-local", req.body);
      return res.status(result.ok ? 200 : 400).json(result);
    });

    app.post("/api/admin/agricultural-machinery/evidence/correct", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = engine.correctEvidence({
        evidenceId: req.body?.evidenceId,
        actor: req.adminUser?.email || req.adminUser?.userId || "admin",
        patch: req.body?.patch || {},
      });
      return res.status(result.ok ? 200 : 400).json(result);
    });
  },
};
