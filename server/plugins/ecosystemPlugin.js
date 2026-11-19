/**
 * Read-only ecosystem health. No sales, payments, or live restore.
 */
const { createCategoryExperts } = require("../lib/pusat/categoryExperts");
const { roster } = require("../lib/pusat/council");
const { readiness: voiceReadiness } = require("../lib/voice/signaling");
const { inventoryDependencies } = require("../lib/security/egressPolicy");
const { DATA_AREAS, RPO_RTO_PROPOSAL } = require("../lib/survival/copies32110");
const { AB27 } = require("../lib/commerce/ab27Tax");
const { IDENTITIES } = require("../lib/marketing/influencerIdentities");
const { assess: assessTaxConnect } = require("../lib/commerce/taxConnect");
const { buildScorecard } = require("../lib/ecosystem/scorecard");
const { listPools } = require("../lib/commerce/taxPools");
const { assessTextile } = require("../lib/storefront/textileProgram");
const { coverage, matchToday } = require("../lib/storefront/holidayProgram");
const { validateCatalogCoverage } = require("../lib/pim/subcategoryCatalogProfile");
const { runSyntheticCustomerJourney } = require("../lib/commerce/syntheticCustomerJourney");
const { validateHubSeoCoverage } = require("../lib/storefront/hubSeoLocaleService");
const { buildIntegrationSnapshots } = require("../lib/operations/integrationSnapshots");
const { evaluatePhase1CoreIntegrity } = require("../lib/platform/phase1CoreIntegrity");
const { evaluatePhase2CategoryInfrastructure } = require("../lib/platform/phase2CategoryInfrastructure");
const { evaluatePhase3ProductPim } = require("../lib/platform/phase3ProductPim");
const { evaluatePhase4SupplierAutomation } = require("../lib/platform/phase4SupplierAutomation");
const { evaluatePhase5PricingProfit } = require("../lib/platform/phase5PricingProfit");
const { evaluatePhase6OrderManagement } = require("../lib/platform/phase6OrderManagement");
const { evaluatePhase7PaymentFinance } = require("../lib/platform/phase7PaymentFinance");
const { evaluatePhase8Logistics } = require("../lib/platform/phase8Logistics");
const { evaluatePhase9TextileAi } = require("../lib/platform/phase9TextileAi");
const { evaluatePhase10Marketplace } = require("../lib/platform/phase10Marketplace");
const { evaluatePhase11PimSot } = require("../lib/platform/phase11PimSot");
const { evaluatePhase12CustomerSupport } = require("../lib/platform/phase12CustomerSupport");
const { evaluatePhase13Pusat } = require("../lib/platform/phase13Pusat");
const { evaluatePhase14AiSpecialists } = require("../lib/platform/phase14AiSpecialists");
const { evaluatePhase15Storefront } = require("../lib/platform/phase15Storefront");
const { evaluatePhase16TaxCompliance } = require("../lib/platform/phase16TaxCompliance");
const { evaluatePhase17Security } = require("../lib/platform/phase17Security");
const { evaluatePhase18Marketing } = require("../lib/platform/phase18Marketing");
const { evaluatePhase19AdminReporting } = require("../lib/platform/phase19AdminReporting");
const { evaluatePhase20Performance } = require("../lib/platform/phase20Performance");
const { evaluatePhase21E2eAutomation } = require("../lib/platform/phase21E2eAutomation");
const { evaluateDevice } = require("../lib/security/deviceStandard");
const { status: esatStatus } = require("../lib/security/esatBey");
const supportedLocales = require("../../lib/i18n/supported-locales.json");

module.exports = {
  register(app) {
    app.get("/api/health/ecosystem", (_req, res) => {
      const experts = createCategoryExperts();
      res.json({
        success: true,
        salesEnabled: false,
        pusatMembers: roster().length,
        masterCategories: experts.treeCount,
        treePreserved: experts.treePreserved,
        ab27: AB27.length,
        voice: voiceReadiness(),
        backupAreas: DATA_AREAS,
        rpoRtoProposal: RPO_RTO_PROPOSAL.note,
        dependencies: inventoryDependencies(),
        marketingIdentities: IDENTITIES.map((i) => ({ id: i.id, synthetic: i.synthetic })),
        languages: supportedLocales.length,
        hubs: experts.hubCount,
        taxConnect: assessTaxConnect(),
        taxPools: { countries: listPools().length, paymentAuthority: false },
        textile: assessTextile(),
        holidays: { ...coverage(), deToday: matchToday({ country: "DE", today: "2026-10-03" }) },
        catalogProfiles: validateCatalogCoverage(),
        syntheticJourney: (() => {
          const j = runSyntheticCustomerJourney();
          return { ok: j.ok, steps: j.stepCount, failed: j.failedSteps, live: false };
        })(),
        hubSeo: validateHubSeoCoverage(),
        integrations: buildIntegrationSnapshots(),
        phaseGates: {
          phase1: evaluatePhase1CoreIntegrity(),
          phase2: evaluatePhase2CategoryInfrastructure(),
          phase3: evaluatePhase3ProductPim(),
          phase4: evaluatePhase4SupplierAutomation(),
          phase5: evaluatePhase5PricingProfit(),
          phase6: evaluatePhase6OrderManagement(),
          phase7: evaluatePhase7PaymentFinance(),
          phase8: evaluatePhase8Logistics(),
          phase9: evaluatePhase9TextileAi(),
          phase10: evaluatePhase10Marketplace(),
          phase11: evaluatePhase11PimSot(),
          phase12: evaluatePhase12CustomerSupport(),
          phase13: evaluatePhase13Pusat(),
          phase14: evaluatePhase14AiSpecialists(),
          phase15: evaluatePhase15Storefront(),
          phase16: evaluatePhase16TaxCompliance(),
          phase17: evaluatePhase17Security(),
          phase18: evaluatePhase18Marketing(),
          phase19: evaluatePhase19AdminReporting(),
          phase20: evaluatePhase20Performance(),
          phase21: evaluatePhase21E2eAutomation(),
        },
        device: evaluateDevice({}),
        esat: esatStatus(),
        scorecard: buildScorecard(),
      });
    });
  },
};
