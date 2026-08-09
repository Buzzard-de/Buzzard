const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const pimCatalog = require("../lib/pimCatalog");

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
    if (!pimCatalog.isEnabled()) {
      console.log("PIM catalog disabled (BUZZARD_PIM_CATALOG=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/pim-catalog/categories", (_req, res) => {
      return res.json(pimCatalog.listCategories());
    });

    app.get("/api/pim-catalog/brands", (_req, res) => {
      return res.json(pimCatalog.listBrands());
    });

    app.get("/api/pim-catalog/products", (req, res) => {
      return res.json(
        pimCatalog.listProducts({
          search: req.query?.search,
          status: req.query?.status,
        })
      );
    });

    app.get("/api/pim-catalog/products/:sku", (req, res) => {
      const result = pimCatalog.getProductBySku(req.params.sku);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/pim-catalog/feed", (_req, res) => {
      return res.json(pimCatalog.getFeed());
    });

    app.post("/api/admin/pim-catalog/products", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.createProduct(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.product);
    });

    app.patch("/api/admin/pim-catalog/products/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.updateProduct(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.product);
    });

    app.post("/api/admin/pim-catalog/translations", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.upsertTranslation(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/pim-catalog/attributes", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.upsertAttribute(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/pim-catalog/media", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.addMedia(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/pim-catalog/seo", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.upsertSeo(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/pim-catalog/variants", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.addVariant(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/pim-catalog/completeness", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(pimCatalog.getCompletenessStats());
    });

    app.post("/api/admin/pim-catalog/import", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = pimCatalog.queueImport(req.body || {});
      return res.status(result.status || 202).json(result.job);
    });

    app.get("/api/admin/pim-catalog/import-jobs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(pimCatalog.listImportJobs());
    });
  },
};
