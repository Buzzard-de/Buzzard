'use strict';

const { getPublicFinalProductionGovernanceSummary } = require('../lib/release/finalProductionGovernance');

module.exports = {
  register(app) {
    app.get('/api/health/final-production-governance', (_req, res) => {
      res.json({ success: true, ...getPublicFinalProductionGovernanceSummary() });
    });
  },
};
