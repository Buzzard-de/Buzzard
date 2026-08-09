const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const localizationFeeds = require("../lib/localizationFeeds");

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
    if (!localizationFeeds.isEnabled()) {
      console.log("Localization feeds disabled (BUZZARD_LOCALIZATION_FEEDS=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/localization/locales", (_req, res) => {
      return res.json(localizationFeeds.listLocales());
    });

    app.get("/api/localization/country/:country", (req, res) => {
      return res.json(localizationFeeds.getCountryConfig(req.params.country));
    });

    app.get("/api/localization/catalog", (req, res) => {
      return res.json(
        localizationFeeds.listLocalizedCatalog({
          locale: req.query?.locale,
          currency: req.query?.currency,
          country: req.query?.country,
          q: req.query?.q,
          category: req.query?.category,
          minPrice: req.query?.minPrice,
          maxPrice: req.query?.maxPrice,
          vehicleId: req.query?.vehicleId,
        })
      );
    });

    app.get("/api/localization/products/slug/:slug", (req, res) => {
      const product = localizationFeeds.getLocalizedProductBySlug(req.params.slug, req.query?.locale || "de-DE");
      if (!product) return res.status(404).json({ error: "Product not found" });
      return res.json(product);
    });

    app.get("/api/localization/feed/google.xml", (req, res) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.end(
        localizationFeeds.buildGoogleMerchantFeed({
          locale: req.query?.locale,
          currency: req.query?.currency,
          country: req.query?.country,
        })
      );
    });

    app.get("/api/admin/localization/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(localizationFeeds.getAdminLocalizationStatus());
    });

    app.post("/api/admin/localization/products/:id/translation", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = localizationFeeds.upsertProductTranslation(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/localization/products/:id/price", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = localizationFeeds.upsertPriceOverride(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/localization/shipping-rate", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = localizationFeeds.upsertShippingRate(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });
  },
};
