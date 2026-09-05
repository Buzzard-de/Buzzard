'use strict';

const { requireAuth } = require('../lib/auth');
const { requirePermission } = require('../lib/rbac');
const adminSafetyGate = require('../lib/operations/adminSafetyGate');
const {
  evaluateFinalProductionGovernance,
  validateFinalProductionGovernance,
} = require('../lib/release/finalProductionGovernance');
const { auditFinalProductionGovernance } = require('../lib/release/finalProductionGovernanceAudit');

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    role: session.role,
  };
  return session;
}

module.exports = {
  register(app) {
    app.get('/api/admin/release/final-production-governance', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      res.json({ success: true, ...evaluateFinalProductionGovernance() });
    });

    app.get('/api/admin/release/final-production-governance/audit', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      res.json({ success: true, ...auditFinalProductionGovernance() });
    });

    app.post('/api/admin/release/final-production-governance/validate', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      try {
        adminSafetyGate.requireAdminAction('go_live', { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      res.json({ success: true, ...validateFinalProductionGovernance(body) });
    });
  },
};
