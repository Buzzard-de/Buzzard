const PROVIDER_STATUS = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  NOT_WIRED: "NOT_WIRED",
  DISABLED: "DISABLED",
  CONFIGURED: "CONFIGURED",
  READY: "READY",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  ACTIVE: "ACTIVE",
  TIMEOUT: "TIMEOUT",
  AUTH_ERROR: "AUTH_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  INVALID_RESPONSE: "INVALID_RESPONSE",
});

function fromHttp(result) {
  if (!result) return PROVIDER_STATUS.PROVIDER_ERROR;
  if (result.ok) return PROVIDER_STATUS.READY;
  if (result.code === "PROVIDER_TIMEOUT" || result.code === "TIMEOUT") return PROVIDER_STATUS.TIMEOUT;
  if (result.code === "PROVIDER_AUTH_FAILED" || result.status === 401 || result.status === 403) {
    return PROVIDER_STATUS.AUTH_ERROR;
  }
  if (result.code === "RATE_LIMITED" || result.status === 429) return PROVIDER_STATUS.RATE_LIMITED;
  if (result.code === "INVALID_RESPONSE" || result.status === 422) return PROVIDER_STATUS.INVALID_RESPONSE;
  if (result.code === "SSRF_BLOCKED") return PROVIDER_STATUS.PROVIDER_ERROR;
  return PROVIDER_STATUS.PROVIDER_ERROR;
}

function snapshot({ configured, wired, disabled, probed, probeOk, liveOk, http }) {
  if (disabled) return PROVIDER_STATUS.DISABLED;
  if (!configured) return PROVIDER_STATUS.NOT_CONFIGURED;
  if (!wired) return PROVIDER_STATUS.NOT_WIRED;
  if (liveOk) return PROVIDER_STATUS.ACTIVE;
  if (probed) {
    if (probeOk) return PROVIDER_STATUS.READY;
    return fromHttp(http);
  }
  return PROVIDER_STATUS.CONFIGURED;
}

module.exports = {
  PROVIDER_STATUS,
  fromHttp,
  snapshot,
};
