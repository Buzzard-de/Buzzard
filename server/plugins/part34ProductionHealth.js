'use strict';

const { getPublicFinalLaunchControlSummary } = require('../lib/release/finalLaunchControl');

module.exports = {
  register(app) {
    app.get('/api/health/final-launch-control', (_req, res) => {
      res.json({ success: true, ...getPublicFinalLaunchControlSummary() });
    });
  },
};
