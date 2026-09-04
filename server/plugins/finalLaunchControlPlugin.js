'use strict';

const { requireAuth } = require('../lib/auth');
const { requirePermission } = require('../lib/rbac');
const adminSafetyGate = require('../lib/operations/adminSafetyGate');
const {
  evaluateFinalLaunchControl,
  validateFinalLaunchControl,
} = require('../lib/release/finalLaunchControl');
const { auditFinalLaunchControl } = require('../lib/release/finalLaunchControlAudit');

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
    app.get('/api/admin/release/final-launch-control', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      res.json({ success: true, ...evaluateFinalLaunchControl() });
    });

    app.get('/api/admin/release/final-launch-control/audit', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      res.json({ success: true, ...auditFinalLaunchControl() });
    });

    app.post('/api/admin/release/final-launch-control/validate', (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, 'system.read')) return;
      try {
        adminSafetyGate.requireAdminAction('go_live', { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      res.json({ success: true, ...validateFinalLaunchControl(body) });
    });
  },
};
