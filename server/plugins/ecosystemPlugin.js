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
const { coverage } = require("../lib/storefront/holidayProgram");
const { evaluateDevice } = require("../lib/security/deviceStandard");
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
        holidays: coverage(),
        device: evaluateDevice({}),
        scorecard: buildScorecard(),
      });
    });
  },
};
