/**
 * The audit log has one writer: `coreAudit`. This module keeps the older
 * call signature working for the plugins that use it.
 */
const coreAudit = require("./coreAudit");

function logAudit(entry) {
  return coreAudit.logAudit(entry || {});
}

function listAudit(limit = 100) {
  return coreAudit.listAudit(limit);
}

module.exports = { logAudit, listAudit };
