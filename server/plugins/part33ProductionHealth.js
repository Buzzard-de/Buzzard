'use strict';

const { getPublicFinalPreLaunchControlSummary } = require('../lib/release/finalPreLaunchControl');

module.exports = {
  register(app) {
    app.get('/api/health/final-prelaunch-control', (_req, res) => {
      res.json({ success: true, ...getPublicFinalPreLaunchControlSummary() });
    });
  },
};
