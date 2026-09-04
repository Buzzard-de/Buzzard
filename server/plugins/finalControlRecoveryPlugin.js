'use strict';

const { requireAuth } = require('../lib/auth');
const { requirePermission } = require('../lib/rbac');
const adminSafetyGate = require('../lib/operations/adminSafetyGate');
const {
  evaluateFinalControlRecoveryReadiness,
} = require('../lib/release/finalControlRecoveryReadiness');
const {
  createFinalControlRecoveryAudit,
} = require('../lib/release/finalControlRecoveryAudit');

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
    app.get('/api/admin/release/final-control-recovery', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      res.json({ success: true, ...evaluateFinalControlRecoveryReadiness() });
    });

    app.get('/api/admin/release/final-control-recovery/audit', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      const readiness = evaluateFinalControlRecoveryReadiness();
      res.json({ success: true, ...createFinalControlRecoveryAudit(readiness) });
    });

    app.post('/api/admin/release/final-control-recovery/validate', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      try {
        adminSafetyGate.requireAdminAction('go_live', { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const result = evaluateFinalControlRecoveryReadiness(body);
      res.json({
        success: true,
        ...result,
        dryRun: true,
        diagnosticOnly: true,
        activationAllowed: false,
        autoActivate: false,
      });
    });
  },
};
