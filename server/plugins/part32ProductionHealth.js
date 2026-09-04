'use strict';

const {
  evaluateFinalControlRecoveryReadiness,
} = require('../lib/release/finalControlRecoveryReadiness');

module.exports = {
  register(app) {
    app.get('/api/health/final-control-recovery', (_req, res) => {
      const result = evaluateFinalControlRecoveryReadiness();
      res.json({
        success: true,
        ready: false,
        status: 'BLOCKED',
        diagnosticOnly: true,
        autoActivate: false,
        activationAllowed: false,
        supplierLive: false,
        salesEnabled: false,
        humanApprovalRequired: true,
        gateCount: result.gates.length,
      });
    });
  },
};
