/** Shared percent / ok aggregation for ordered master phases. */
function finalizePhase(phase, title, checks, blockedExternalIds = []) {
  const blocked = new Set(blockedExternalIds);
  const software = checks.filter((c) => !blocked.has(c.id));
  const blockedChecks = checks.filter((c) => blocked.has(c.id));
  const passed = software.filter((c) => c.ok).length;
  const total = software.length;
  const allPassed = checks.filter((c) => c.ok).length;
  const allTotal = checks.length;
  const softwarePercent = total ? Math.round((passed / total) * 1000) / 10 : 100;
  const requirementPercent = allTotal ? Math.round((allPassed / allTotal) * 1000) / 10 : 100;
  return {
    phase,
    title,
    ok: passed === total,
    percentComplete: softwarePercent,
    softwareCompletionPercent: softwarePercent,
    requirementCoveragePercent: requirementPercent,
    passed,
    total,
    blockedExternal: blockedChecks.map((c) => c.id),
  checks,
    live: false,
    completeClaim: passed === total && blockedChecks.length === 0,
    softwareCompleteClaim: passed === total,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { finalizePhase };