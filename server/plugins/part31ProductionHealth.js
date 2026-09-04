'use strict';

const { getPublicFinalLaunchGovernanceSummary } = require('../lib/release/finalLaunchGovernance');

module.exports = {
  register(app) {
    app.get('/api/health/final-launch-governance', (_req, res) => {
      res.json({ success: true, ...getPublicFinalLaunchGovernanceSummary() });
    });
  },
};
