/**
 * Part 18 — Central storefront & customer readiness (diagnostic only).
 */
const { STOREFRONT_GATES, READINESS_OVERALL } = require("../../core/storefrontReadinessConstants");
const { READINESS_GATE_STATUS } = require("../../core/operationsConstants");
const catalogReadService = require("./catalogReadService");
const storefrontSearchService = require("./storefrontSearchService");
const storefrontCategoryService = require("./storefrontCategoryService");
const storefrontProductQuality = require("./storefrontProductQuality");
const storefrontSeoService = require("./storefrontSeoService");
const merchantFeedService = require("./merchantFeedService");
const storefrontI18nReadiness = require("./storefrontI18nReadiness");
const customerAccountReadiness = require("./customerAccountReadiness");
const checkoutSafetyReadiness = require("./checkoutSafetyReadiness");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const { isLiveImportEnabled } = require("../supplier/realSupplierConnector");

function gate(name, status, detail, extras = {}) {
  return { gate: name, status, detail, ...extras };
}

function evaluateStorefrontReadiness() {
  const gates = [];
  const flags = getEffectiveFlags();
  const catalogHealth = catalogReadService.getHealth();

  gates.push(
    gate(
      "STOREFRONT",
      catalogHealth.enabled ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `bridge=${catalogHealth.enabled} publicProducts=${catalogHealth.productCount}`,
      { productCount: catalogHealth.productCount }
    )
  );

  const search = storefrontSearchService.getSearchReadiness();
  gates.push(
    gate(
      "SEARCH",
      search.enabled ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.FAIL,
      `fields=${search.supportedFields.length} demoExcluded=${search.demoExcluded}`
    )
  );

  const categories = storefrontCategoryService.getCategoryReadiness();
  gates.push(
    gate(
      "CATEGORIES",
      categories.customerVisible > 0 ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `${categories.customerVisible}/${categories.totalCategories} visible`
    )
  );

  const quality = storefrontProductQuality.getProductQualityReadiness();
  gates.push(
    gate(
      "PRODUCT_QUALITY",
      quality.missingGtinBlocked && quality.demoRejected
        ? READINESS_GATE_STATUS.PASS
        : READINESS_GATE_STATUS.FAIL,
      `public=${quality.publicProductCount} pipeline=${quality.pipeline}`
    )
  );

  const seo = storefrontSeoService.getSeoReadiness();
  gates.push(
    gate(
      "SEO",
      READINESS_GATE_STATUS.PASS,
      `sitemapProducts=${seo.sitemapProductCount} fakeBlocked=${!seo.fakeProductsInSitemap}`
    )
  );

  const feed = merchantFeedService.getMerchantFeedReadiness();
  gates.push(
    gate(
      "MERCHANT_FEED",
      READINESS_GATE_STATUS.PASS,
      `eligible=${feed.eligibleItemCount} unverifiedExcluded=${feed.unverifiedGtinExcluded}`
    )
  );

  const i18n = storefrontI18nReadiness.getI18nReadiness();
  gates.push(
    gate(
      "I18N",
      i18n.requiredPresent ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `locales=${i18n.configuredLocales.join(",")} fr=${i18n.frConfigured}`
    )
  );

  const customer = customerAccountReadiness.getCustomerAccountReadiness();
  gates.push(
    gate(
      "CUSTOMER_AUTH",
      customer.registrationReady && customer.loginReady ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `users=${customer.userCount} ordersEnabled=${customer.realOrdersEnabled}`
    )
  );

  gates.push(
    gate(
      "CART",
      !flags.salesEnabled ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `catalogMode=${!flags.salesEnabled}`
    )
  );

  const checkout = checkoutSafetyReadiness.getCheckoutSafetyReadiness();
  gates.push(
    gate(
      "CHECKOUT",
      checkout.failClosed && !checkout.realCheckoutCompletes ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `mockPayment=${checkout.mockPaymentOnly} blocked=${checkout.commercialTransactionBlocked}`
    )
  );

  const safetyOk =
    !flags.salesEnabled &&
    !flags.stripeEnabled &&
    !flags.paypalEnabled &&
    !flags.supplierOrdersEnabled &&
    flags.mockPaymentOnly &&
    goLiveApproval.PRODUCTION_SAFETY_LOCK &&
    !isLiveImportEnabled();

  gates.push(
    gate(
      "SAFETY",
      safetyOk ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `sales=${flags.salesEnabled} goLiveLock=${goLiveApproval.PRODUCTION_SAFETY_LOCK}`
    )
  );

  const summary = {
    pass: gates.filter((g) => g.status === READINESS_GATE_STATUS.PASS).length,
    fail: gates.filter((g) => g.status === READINESS_GATE_STATUS.FAIL).length,
    blocked: gates.filter((g) => g.status === READINESS_GATE_STATUS.BLOCKED).length,
    condition: gates.filter((g) => g.status === READINESS_GATE_STATUS.CONDITION).length,
  };

  const overall =
    summary.fail > 0 || summary.blocked > 0
      ? READINESS_OVERALL.NOT_READY
      : summary.condition > 0
        ? READINESS_OVERALL.CONDITION
        : READINESS_OVERALL.READY;

  return {
    STOREFRONT_READINESS: {
      overall,
      diagnosticOnly: true,
      autoActivate: false,
      gateNames: STOREFRONT_GATES,
      gates,
      summary,
      publicProductCount: catalogHealth.productCount,
      salesEnabled: flags.salesEnabled,
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  evaluateStorefrontReadiness,
};
