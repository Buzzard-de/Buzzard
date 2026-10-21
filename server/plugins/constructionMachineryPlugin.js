/**
 * Construction Machinery Search & Compatibility Engine HTTP surface.
 * Catalog mode only. No live supplier calls, purchases, or sales-flag changes.
 */

const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { getEngine } = require("../lib/constructionMachinery");
const { ensureEngineSeeded } = require("../lib/machineryDomainKit/seedMocks");

function publicError(res, status, code, message) {
  return res.status(status).json({ ok: false, error: code, message });
}

function parseLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

module.exports = {
  register(app) {
    const engine = getEngine();
    ensureEngineSeeded("construction").catch((error) => {
      console.warn("construction mock seed skipped:", error.message);
    });

    app.get("/api/construction-machinery/health", (_req, res) => {
      return res.json({ ok: true, ...engine.health() });
    });

    app.get("/api/construction-machinery/taxonomy", (req, res) => {
      const language = String(req.query.lang || "de").slice(0, 2);
      return res.json({
        ok: true,
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
          attributes: category.attributes,
        })),
      });
    });

    app.get("/api/construction-machinery/machines", (req, res) => {
      const q = String(req.query.q || "").toLowerCase();
      const items = engine.listMachines().filter((machine) => {
        if (!q) return true;
        return `${machine.manufacturer} ${machine.modelName} ${machine.modelCode}`.toLowerCase().includes(q);
      });
      return res.json({ ok: true, items, total: items.length });
    });

    app.get("/api/construction-machinery/machines/:id", (req, res) => {
      const machine = engine.getMachine(req.params.id);
      if (!machine) return publicError(res, 404, "unknown_machine", "Machine not found");
      return res.json({ ok: true, machine });
    });

    app.get("/api/construction-machinery/parts/:id", (req, res) => {
      const part = engine.getPart(req.params.id);
      if (!part) return publicError(res, 404, "unknown_part", "Part not found");
      return res.json({ ok: true, part });
    });

    app.get("/api/construction-machinery/search", (req, res) => {
      const result = engine.search({
        q: req.query.q,
        oem: req.query.oem,
        partNumber: req.query.partNumber,
        manufacturer: req.query.manufacturer,
        modelName: req.query.model,
        modelCode: req.query.modelCode,
        serialNumber: req.query.serial,
        year: req.query.year ? Number(req.query.year) : undefined,
        position: req.query.position,
        categoryId: req.query.categoryId,
        machineId: req.query.machineId,
        verifiedOnly: req.query.verifiedOnly === "1",
        page: req.query.page,
        pageSize: parseLimit(req.query.pageSize),
      });
      return res.json({ ok: true, ...result });
    });

    app.post("/api/construction-machinery/compatibility", (req, res) => {
      const body = req.body || {};
      const decision = engine.evaluate({
        partId: body.partId,
        oemPartNumber: body.oemPartNumber || body.oem,
        machineId: body.machineId,
        manufacturer: body.manufacturer,
        modelName: body.modelName || body.model,
        modelCode: body.modelCode,
        serialNumber: body.serialNumber || body.serial,
        year: body.year,
        position: body.position,
        engineModel: body.engineModel,
        revision: body.revision,
        configuration: body.configuration,
      });
      return res.json({ ok: true, decision });
    });

    app.get("/api/construction-machinery/offers", (req, res) => {
      if (!req.query.partId && !req.query.oem) {
        return res.json({
          ok: true,
          items: [],
          status: "NOT_CONFIGURED",
          note: "No live supplier inventory is configured. Mock offers appear only after a local mock import.",
        });
      }
      let partId = req.query.partId;
      if (!partId && req.query.oem) {
        const found = engine.findPartsByNumber(req.query.oem, req.query.manufacturer);
        partId = found[0]?.id;
      }
      if (!partId) {
        return res.json({ ok: true, items: [], status: "UNKNOWN" });
      }
      const ranked = engine.rankOffers({
        partId,
        manufacturer: req.query.manufacturer,
        modelCode: req.query.modelCode,
        serialNumber: req.query.serial,
        year: req.query.year ? Number(req.query.year) : undefined,
      });
      return res.json({ ok: true, ...ranked });
    });

    app.get("/api/construction-machinery/documents", (_req, res) => {
      return res.json({
        ok: true,
        items: engine.listDocuments(),
        visualSearch: engine.suggestVisualCandidates(),
      });
    });

    app.get("/api/construction-machinery/integrations", (_req, res) => {
      return res.json({ ok: true, connectors: engine.registry.list() });
    });

    app.get("/api/admin/construction-machinery/overview", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ ok: true, ...engine.health() });
    });

    app.get("/api/admin/construction-machinery/jobs", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ ok: true, jobs: engine.listJobs() });
    });

    app.get("/api/admin/construction-machinery/jobs/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const job = engine.getJob(req.params.id);
      if (!job) return publicError(res, 404, "unknown_job", "Import job not found");
      return res.json({ ok: true, job });
    });

    app.post("/api/admin/construction-machinery/import", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const connectorId = req.body?.connectorId || "mock-local";
      const result = await engine.importFrom(connectorId, req.body);
      return res.status(result.ok ? 200 : 400).json(result);
    });

    app.post("/api/admin/construction-machinery/machines", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = engine.upsertMachine(req.body || {});
      return res.status(result.ok ? 201 : 400).json(result);
    });

    app.post("/api/admin/construction-machinery/parts", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = engine.upsertPart(req.body || {});
      return res.status(result.ok ? 201 : 400).json(result);
    });

    app.post("/api/admin/construction-machinery/evidence", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = engine.addEvidence(req.body || {});
      return res.status(result.ok ? 201 : 400).json(result);
    });
  },
};
