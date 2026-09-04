"use strict";

const PART27_STATUS = Object.freeze({
  READY: "READY",
  CONDITION: "CONDITION",
  BLOCKED: "BLOCKED",
});

const PART27_GATES = Object.freeze([
  "configuration",
  "security",
  "authentication",
  "authorization",
  "monitoring",
  "alerting",
  "incidentReadiness",
  "backupReadiness",
  "databaseReadiness",
  "workerReadiness",
  "releaseReadiness",
  "environmentSafety",
  "supplierSafety",
  "commerceSafety",
  "goLiveApproval",
]);

module.exports = {
  PART27_STATUS,
  PART27_GATES,
};
