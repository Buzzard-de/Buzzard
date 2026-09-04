'use strict';
const {
  evaluateFinalOperationalReadiness,
} = require('../lib/release/finalOperationalReadiness');

function buildPart30ProductionHealth(input = {}) {
  const result = evaluateFinalOperationalReadiness(input);
  return Object.freeze({
    service: 'buzzard',
    check: 'part30-final-operational-readiness',
    status: result.status,
    ready: false,
    diagnosticOnly: true,
    autoActivate: false,
    activationAllowed: false,
    supplierLive: false,
    salesEnabled: false,
    humanApprovalRequired: true,
    secretsExposed: false,
  });
}

module.exports = {
  register(app) {
    app.get('/api/health/final-operational-readiness', (_req, res) => {
      res.json({ success: true, ...buildPart30ProductionHealth() });
    });
  },
  buildPart30ProductionHealth,
};
