/**
 * Backup coverage inventory. Offsite/WORM remain blocked without operator hosts.
 */
const { DATA_AREAS, RPO_RTO_PROPOSAL } = require("./copies32110");
const { assessBackupLock } = require("./backupLock");
const { assessWorm } = require("./wormProvider");
const { configured } = require("./offsiteAdapter");

const EXTRA_AREAS = Object.freeze(["tax_configuration", "certificates_metadata_not_private_keys"]);

function coverage() {
  const lock = assessBackupLock();
  const worm = assessWorm();
  return {
    areas: [...DATA_AREAS, ...EXTRA_AREAS],
    copiesLocal: 3,
    offsite: lock.offsiteConfigured || configured(),
    worm: worm.worm,
    wormIsChmod444: false,
    wormCode: worm.code,
    separateCredentials: false,
    status: lock.missing.length ? "BLOCKED" : "HUMAN_APPROVAL_REQUIRED",
    rpoRto: {
      ...RPO_RTO_PROPOSAL,
      measured: false,
      note: "Proposal only. Isolated restore timings are not production SLA.",
    },
    productionRestore: false,
  };
}

module.exports = { EXTRA_AREAS, coverage };
