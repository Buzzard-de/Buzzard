const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const catalogSeo = require("../lib/catalogSeo");

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
    if (!catalogSeo.isEnabled()) {
      console.log("Catalog SEO disabled (BUZZARD_CATALOG_SEO=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/catalog/categories", (_req, res) => {
      return res.json(catalogSeo.listCategories());
    });

    app.get("/api/catalog/products", (req, res) => {
      return res.json(
        catalogSeo.listProducts({
          q: req.query?.q,
          category: req.query?.category,
          minPrice: req.query?.minPrice,
          maxPrice: req.query?.maxPrice,
        })
      );
    });

    app.get("/api/catalog/products/slug/:slug", (req, res) => {
      const product = catalogSeo.getProductBySlug(req.params.slug);
      if (!product) return res.status(404).json({ error: "Product not found" });
      return res.json(product);
    });

    app.get("/api/catalog/products/:id/jsonld", (req, res) => {
      const jsonld = catalogSeo.getProductJsonLd(req.params.id);
      if (!jsonld) return res.status(404).json({ error: "Product not found" });
      return res.json(jsonld);
    });

    app.get("/api/catalog/sitemap.xml", (_req, res) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(catalogSeo.buildSitemapXml());
    });

    app.get("/api/catalog/robots.txt", (_req, res) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(catalogSeo.buildRobotsTxt());
    });

    app.get("/api/admin/catalog/products", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(catalogSeo.listAdminProducts());
    });

    app.post("/api/admin/catalog/categories", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = catalogSeo.createCategory(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.category);
    });

    app.post("/api/admin/catalog/products", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = catalogSeo.createProduct(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.product);
    });

    app.patch("/api/admin/catalog/products/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = catalogSeo.updateProduct(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.product);
    });

    app.post("/api/admin/catalog/products/bulk-price", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const margin = req.body?.margin ?? process.env.DEFAULT_MARGIN ?? 0.3;
      return res.json(catalogSeo.bulkUpdatePrices(margin));
    });

    app.post("/api/admin/catalog/products/:id/images", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = catalogSeo.addProductImage(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.image);
    });
  },
};
