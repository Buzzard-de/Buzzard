/**
 * Retry / circuit / dead-letter. Process-local; not a clustered production bus.
 */
function circuitState({ failures = 0, threshold = 5 } = {}) {
  const open = Number(failures) >= Number(threshold);
  return {
    state: open ? "OPEN" : "CLOSED_UNKNOWN_HEALTH",
    failures: Number(failures) || 0,
    threshold: Number(threshold) || 5,
    liveProbe: false,
  };
}

function retryDecision({ attempt = 0, maxAttempts = 3, retryable = true } = {}) {
  const next = Number(attempt) + 1;
  const allow = retryable && next <= maxAttempts;
  return {
    attempt: next,
    maxAttempts,
    retry: allow,
    deadLetter: !allow,
    live: false,
  };
}

function enqueueDeadLetter(event = {}) {
  return {
    queued: false,
    stored: false,
    live: false,
    replay: false,
    recovered: false,
    event: { type: event.type || null, untrustedExternal: true },
  };
}

module.exports = { circuitState, retryDecision, enqueueDeadLetter };
