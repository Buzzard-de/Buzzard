function backupStatus() {
  return {
    processSupervision: false,
    alwaysOn: false,
    localSqlite: true,
    offsite: false,
    immutable: false,
    worm: false,
    restoreTestedOffsite: false,
    strategy32110: "NOT_MET",
    rpo: "UNKNOWN",
    rto: "UNKNOWN",
    status: "CODE_READY",
    liveVerified: false,
    note: "Changing file mode is not an immutable backup.",
  };
}

module.exports = { backupStatus };
