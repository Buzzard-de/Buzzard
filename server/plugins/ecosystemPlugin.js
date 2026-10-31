/**
 * Read-only ecosystem health. No sales, payments, or live restore.
 */
const { createCategoryExperts } = require("../lib/pusat/categoryExperts");
const { roster } = require("../lib/pusat/council");
const { assessVoice } = require("../lib/voice/voiceReadiness");
const { inventoryDependencies } = require("../lib/security/egressPolicy");
const { DATA_AREAS, RPO_RTO_PROPOSAL } = require("../lib/survival/copies32110");
const { AB27 } = require("../lib/commerce/ab27Tax");
const { IDENTITIES } = require("../lib/marketing/influencerIdentities");

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
        voice: assessVoice(),
        backupAreas: DATA_AREAS,
        rpoRtoProposal: RPO_RTO_PROPOSAL.note,
        dependencies: inventoryDependencies(),
        marketingIdentities: IDENTITIES.map((i) => ({ id: i.id, synthetic: i.synthetic })),
      });
    });
  },
};
