const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const productCatalogPim = require("../lib/productCatalogPim");

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
    if (!productCatalogPim.isEnabled()) {
      console.log("Product catalog PIM disabled (BUZZARD_PRODUCT_CATALOG_PIM=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/product-catalog-pim/brands", (req, res) => {
      const result = productCatalogPim.createBrand(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.brand);
    });

    app.get("/api/product-catalog-pim/brands", (req, res) => {
      return res.json(productCatalogPim.listBrands());
    });

    app.post("/api/product-catalog-pim/categories", (req, res) => {
      const result = productCatalogPim.createCategory(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.category);
    });

    app.get("/api/product-catalog-pim/categories", (req, res) => {
      return res.json(productCatalogPim.listCategories());
    });

    app.post("/api/product-catalog-pim/products", (req, res) => {
      const result = productCatalogPim.createProduct(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json({ product: result.product, completeness: result.completeness });
    });

    app.get("/api/product-catalog-pim/products/:sku", (req, res) => {
      const result = productCatalogPim.getProductBySku(req.params.sku);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.put("/api/product-catalog-pim/products/:sku/translation/:language", (req, res) => {
      const result = productCatalogPim.upsertTranslation(req.params.sku, req.params.language, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.translation);
    });

    app.post("/api/product-catalog-pim/products/:sku/attributes", (req, res) => {
      const result = productCatalogPim.upsertAttribute(req.params.sku, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/product-catalog-pim/products/:sku/media", (req, res) => {
      const result = productCatalogPim.addMedia(req.params.sku, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(201).json(result.media);
    });

    app.post("/api/product-catalog-pim/products/:sku/variants", (req, res) => {
      const result = productCatalogPim.createVariant(req.params.sku, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.variant);
    });

    app.get("/api/admin/product-catalog-pim/products", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(productCatalogPim.listAdminProducts(req.query || {}));
    });

    app.get("/api/admin/product-catalog-pim/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(productCatalogPim.getProductCatalogPimOverview());
    });
  },
};
