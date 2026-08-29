const { SERVICE_STATUS } = require("./constants");

function mapHealthToServiceStatus(healthy, warning = false) {
  if (healthy === null || healthy === undefined) return SERVICE_STATUS.UNKNOWN;
  if (warning) return SERVICE_STATUS.WARNING;
  return healthy ? SERVICE_STATUS.ONLINE : SERVICE_STATUS.OFFLINE;
}

module.exports = { mapHealthToServiceStatus, SERVICE_STATUS };
