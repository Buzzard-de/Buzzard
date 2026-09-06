const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const countryRegistry = require("../core/globalCountryRegistry");
const languageRegistry = require("../core/globalLanguageRegistry");
const currencyRegistry = require("../core/globalCurrencyRegistry");
const { buildLocaleContext } = require("../lib/global/localeResolution");
const { resolveCountry } = require("../lib/global/countryDetection");
const { searchProducts, detectAutomotiveSearchIntent } = require("../lib/global/searchIntelligence");
const { buildZeroResultResponse } = require("../lib/global/zeroResultIntelligence");
const { buildGlobalCatalogHealth } = require("../lib/global/globalCatalogHealth");
const { buildCountryCatalogMatrix } = require("../lib/global/countryCatalogMatrix");
const { runGlobalProductPipeline } = require("../lib/global/globalProductPipeline");
const { loadSearchCatalog } = require("../lib/global/globalCatalogSearch");
const { buildProductValidationReport } = require("../lib/global/productValidationReport");
const { collectProductStats } = require("../lib/global/globalCatalogStats");
const { GLOBAL_SAFETY_POLICY } = require("../core/globalSafetyPolicy");
const fs = require("fs");
const path = require("path");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = { userId: session.userId, role: session.role };
  return session;
}

function hasModule(modulePath) {
  try {
    fs.accessSync(path.join(__dirname, "..", modulePath));
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  register(app) {
    app.get("/api/config/countries", (_req, res) => {
      res.json({
        success: true,
        count: countryRegistry.getCountryCount(),
        countries: countryRegistry.listCountries(),
        safety: GLOBAL_SAFETY_POLICY,
      });
    });

    app.get("/api/config/languages", (_req, res) => {
      res.json({
        success: true,
        languages: languageRegistry.listLanguages(),
        uiLocales: languageRegistry.UI_LOCALES,
        readiness: languageRegistry.READINESS,
        safety: GLOBAL_SAFETY_POLICY,
      });
    });

    app.get("/api/config/locales", (req, res) => {
      const country = req.query.country || "DE";
      const language = req.query.language;
      const context = buildLocaleContext({
        countryCode: country,
        explicitLanguage: language,
        browserLanguages: String(req.headers["accept-language"] || "")
          .split(",")
          .map((v) => v.trim()),
      });
      res.json({ success: true, context, safety: GLOBAL_SAFETY_POLICY });
    });

    app.get("/api/catalog/context", (req, res) => {
      const resolvedCountry = resolveCountry({
        req,
        savedCountryCode: req.query.country,
        browserLocale: req.headers["accept-language"],
      });
      const context = buildLocaleContext({
        countryCode: resolvedCountry.countryCode,
        explicitLanguage: req.query.language,
        savedLanguage: req.query.language,
        browserLanguages: String(req.headers["accept-language"] || "")
          .split(",")
          .map((v) => v.trim()),
        countrySource: resolvedCountry.source,
      });
      res.json({
        success: true,
        ...context,
        catalog: countryRegistry.getCatalogContext(context.country),
        safety: GLOBAL_SAFETY_POLICY,
      });
    });

    app.get("/api/global/search", (req, res) => {
      const query = String(req.query.q || "").trim();
      const context = {
        country: req.query.country || "DE",
        language: req.query.language || "de",
        categoryId: req.query.category,
        vehicleId: req.query.vehicleId,
      };
      const products = loadSearchCatalog();
      if (!query) {
        return res.json({ success: true, resultCount: 0, results: [], catalogSize: products.length, safety: GLOBAL_SAFETY_POLICY });
      }
      const result = searchProducts(products, query, context);
      if (result.resultCount === 0) {
        return res.json({
          success: true,
          ...result,
          catalogSize: products.length,
          zeroResult: buildZeroResultResponse(query, context),
          automotiveIntent: detectAutomotiveSearchIntent(query),
          safety: GLOBAL_SAFETY_POLICY,
        });
      }
      return res.json({ success: true, ...result, catalogSize: products.length, safety: GLOBAL_SAFETY_POLICY });
    });

    app.get("/api/admin/pim-core/global-catalog-health", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const stats = collectProductStats();
      res.json({
        success: true,
        health: buildGlobalCatalogHealth({
          stats,
          hasPimFoundation: hasModule("lib/pim/categoryResolver.js"),
          hasAutomotive: hasModule("lib/catalog/automotivePimBridge.js"),
          hasReconciliation: hasModule("lib/pim/productValidationPipeline.js"),
        }),
      });
    });

    app.get("/api/admin/pim-core/country-matrix", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const stats = collectProductStats();
      res.json({
        success: true,
        matrix: buildCountryCatalogMatrix(stats.byCountry || {}),
        safety: GLOBAL_SAFETY_POLICY,
      });
    });

    app.post("/api/admin/global/products/validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const product = req.body?.product || req.body || {};
      const context = req.body?.context || {};
      const pipeline = runGlobalProductPipeline(product, context);
      const report = buildProductValidationReport(product, context);
      res.json({ success: true, validation: pipeline, report, safety: GLOBAL_SAFETY_POLICY });
    });

    app.post("/api/admin/automotive/products/pipeline", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      try {
        const { runAutomotiveProductPipeline } = require("../lib/catalog/automotiveProductPipeline");
        const result = runAutomotiveProductPipeline(req.body?.product || req.body || {}, req.body?.context || {});
        res.json({ success: true, pipeline: result, safety: GLOBAL_SAFETY_POLICY });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message, safety: GLOBAL_SAFETY_POLICY });
      }
    });

    app.post("/api/admin/automotive/products/:sku/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const sku = req.params.sku;
      const manualPublish = Boolean(req.body?.manualPublish);
      res.json({
        success: true,
        sku,
        approved: true,
        published: false,
        manualPublish,
        note: "APPROVED != PUBLISHED. Publish remains blocked by safety policy.",
        safety: GLOBAL_SAFETY_POLICY,
      });
    });

    console.log("Global localization plugin registered (35-country foundation, diagnostic only)");
  },
};
