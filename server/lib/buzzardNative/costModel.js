/**
 * Cost model. Unknown amounts stay UNKNOWN. Not a live TCO.
 */
function costModel() {
  const unknown = {
    development: "UNKNOWN",
    training: "UNKNOWN",
    hardware: "UNKNOWN",
    electricity: "UNKNOWN",
    maintenance: "UNKNOWN",
    operations: "UNKNOWN",
    perDay: "UNKNOWN",
    perUser: "UNKNOWN",
    concurrentCapacity: "UNKNOWN",
  };
  return {
    live: false,
    measured: false,
    motors: {
      thinking: { ...unknown },
      hearing: { ...unknown },
      speech: { ...unknown },
      vision: { ...unknown },
      memory: { ...unknown },
      digital_body: { ...unknown },
      motion: { ...unknown },
      realtime: { ...unknown },
    },
    externalApiAlternative: "NOT_USED_AS_CORE_ENGINE",
    tcoComparison: "INCOMPLETE_WITHOUT_MEASUREMENTS",
  };
}

module.exports = { costModel };
