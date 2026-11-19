/** Shared percent / ok aggregation for ordered master phases. */
function finalizePhase(phase, title, checks, blockedExternalIds = []) {
  const blocked = new Set(blockedExternalIds);
  const software = checks.filter((c) => !blocked.has(c.id));
  const passed = software.filter((c) => c.ok).length;
  const total = software.length;
  return {
    phase,
    title,
    ok: passed === total,
    percentComplete: total ? Math.round((passed / total) * 1000) / 10 : 100,
    passed,
    total,
    checks,
    live: false,
    completeClaim: passed === total,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { finalizePhase };