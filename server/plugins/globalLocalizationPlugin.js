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
      const products = [];
      if (!query) {
        return res.json({ success: true, resultCount: 0, results: [], safety: GLOBAL_SAFETY_POLICY });
      }
      const result = searchProducts(products, query, context);
      if (result.resultCount === 0) {
        return res.json({
          success: true,
          ...result,
          zeroResult: buildZeroResultResponse(query, context),
          automotiveIntent: detectAutomotiveSearchIntent(query),
          safety: GLOBAL_SAFETY_POLICY,
        });
      }
      return res.json({ success: true, ...result, safety: GLOBAL_SAFETY_POLICY });
    });

    app.get("/api/admin/pim-core/global-catalog-health", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        health: buildGlobalCatalogHealth({
          hasPimFoundation: hasModule("lib/pim/categoryResolver.js"),
          hasAutomotive: hasModule("lib/catalog/automotivePimBridge.js"),
          hasReconciliation: hasModule("lib/pim/productValidationPipeline.js"),
        }),
      });
    });

    app.get("/api/admin/pim-core/country-matrix", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        matrix: buildCountryCatalogMatrix(),
        safety: GLOBAL_SAFETY_POLICY,
      });
    });

    app.post("/api/admin/global/products/validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const result = runGlobalProductPipeline(req.body?.product || req.body || {}, req.body?.context || {});
      res.json({ success: true, validation: result });
    });

    console.log("Global localization plugin registered (35-country foundation, diagnostic only)");
  },
};
