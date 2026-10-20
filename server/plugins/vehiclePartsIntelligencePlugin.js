const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { getEngine } = require("../lib/vehiclePartsIntelligence");
const isolation = require("../lib/machineryDomainKit/isolation");

function publicError(res, status, code, message) {
  return res.status(status).json({ ok: false, error: code, message });
}

module.exports = {
  register(app) {
    const engine = getEngine();

    app.get("/api/vehicle-parts/health", (_req, res) => {
      return res.json({ ok: true, ...engine.health() });
    });

    app.get("/api/vehicle-parts/taxonomy", (req, res) => {
      const language = String(req.query.lang || "de").slice(0, 2);
      return res.json({
        ok: true,
        domain: "automotive",
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
          vehicleClasses: category.vehicleClasses,
        })),
      });
    });

    app.get("/api/vehicle-parts/search", (req, res) => {
      const scope = isolation.assertAutomotiveScope({
        categoryId: req.query.categoryId || "cat-05",
        domain: "automotive",
      });
      if (!scope.ok) return res.status(400).json({ ok: false, isolation: scope });
      return res.json({
        ok: true,
        ...engine.search({
          q: req.query.q,
          oem: req.query.oem,
          partNumber: req.query.partNumber,
          manufacturer: req.query.manufacturer,
          model: req.query.model,
          modelName: req.query.model,
          generation: req.query.generation,
          engineCode: req.query.engineCode,
          gearboxCode: req.query.gearboxCode,
          year: req.query.year ? Number(req.query.year) : undefined,
          vehicleId: req.query.vehicleId,
          categoryId: req.query.categoryId,
          assemblyId: req.query.assemblyId,
          thread: req.query.thread,
          page: req.query.page,
          pageSize: req.query.pageSize,
        }),
      });
    });

    app.get("/api/vehicle-parts/vehicles", (req, res) => {
      const q = String(req.query.q || "").toLowerCase();
      const items = engine.listVehicles().filter((vehicle) => {
        if (!q) return true;
        return `${vehicle.manufacturer} ${vehicle.model} ${vehicle.engineCode || ""}`.toLowerCase().includes(q);
      });
      return res.json({ ok: true, items, total: items.length });
    });

    app.get("/api/vehicle-parts/vehicles/:id", (req, res) => {
      const vehicle = engine.getVehicle(req.params.id);
      if (!vehicle) return publicError(res, 404, "unknown_vehicle", "Vehicle not found");
      return res.json({ ok: true, vehicle });
    });

    app.post("/api/vehicle-parts/compatibility", (req, res) => {
      const body = req.body || {};
      const scope = isolation.assertAutomotiveScope({
        categoryId: body.categoryId || "cat-05",
        domain: "automotive",
      });
      if (!scope.ok) return res.status(400).json({ ok: false, isolation: scope });
      return res.json({ ok: true, decision: engine.evaluate(body) });
    });

    app.post("/api/vehicle-parts/cross-reference", (req, res) => {
      const body = req.body || {};
      return res.json({ ok: true, result: engine.classifyCrossReference(body) });
    });

    app.post("/api/vehicle-parts/vin-inspect", (req, res) => {
      const vin = req.body?.vin || req.query.vin;
      const inspection = engine.inspectVin(vin);
      return res.json({
        ok: Boolean(inspection.ok),
        inspection: {
          ok: inspection.ok,
          reason: inspection.reason || null,
          wmi: inspection.wmi || null,
          last6: inspection.last6 || null,
          hash: inspection.hash || null,
          decoderAuthoritative: false,
          fullVinStored: false,
          fullVinEchoed: false,
        },
      });
    });

    app.get("/api/vehicle-parts/offers", (req, res) => {
      if (!req.query.partId && !req.query.oem) {
        return res.json({ ok: true, items: [], status: "NOT_CONFIGURED" });
      }
      let partId = req.query.partId;
      if (!partId && req.query.oem) partId = engine.findPartsByNumber(req.query.oem, req.query.manufacturer)[0]?.id;
      if (!partId) return res.json({ ok: true, items: [], status: "UNKNOWN" });
      return res.json({
        ok: true,
        ...engine.rankOffers({
          partId,
          manufacturer: req.query.manufacturer,
          model: req.query.model,
          generation: req.query.generation,
          engineCode: req.query.engineCode,
          year: req.query.year ? Number(req.query.year) : undefined,
          categoryId: req.query.categoryId || "cat-05",
        }),
      });
    });

    app.get("/api/vehicle-parts/integrations", (_req, res) => {
      return res.json({ ok: true, connectors: engine.registry.list() });
    });

    app.get("/api/admin/vehicle-parts/overview", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ ok: true, ...engine.health() });
    });

    app.get("/api/admin/vehicle-parts/jobs", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ ok: true, jobs: engine.listJobs() });
    });

    app.post("/api/admin/vehicle-parts/import", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = await engine.importFrom(req.body?.connectorId || "mock-vpe-local", req.body);
      return res.status(result.ok ? 200 : 400).json(result);
    });

    app.post("/api/admin/vehicle-parts/evidence/correct", (req, res) => {
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
