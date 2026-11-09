/**
 * External-call truth labels. Never report SUCCESS as LIVE unless live.
 */
const MODE = Object.freeze({
  MOCK: "MOCK",
  DRY_RUN: "DRY_RUN",
  LIVE: "LIVE",
  DISABLED: "DISABLED",
});

function label(mode, extra = {}) {
  const normalized = MODE[mode] || MODE.DISABLED;
  return {
    mode: normalized,
    live: normalized === MODE.LIVE,
    mock: normalized === MODE.MOCK,
    dryRun: normalized === MODE.DRY_RUN,
    ...extra,
  };
}

function forbidFakeLive(mode, ok) {
  if (mode === MODE.LIVE && ok) return { ok: true, ...label(MODE.LIVE) };
  if (ok && (mode === MODE.MOCK || mode === MODE.DRY_RUN)) {
    return { ok: true, ...label(mode), fakeSuccess: false };
  }
  return { ok: false, ...label(mode || MODE.DISABLED) };
}

module.exports = { MODE, label, forbidFakeLive };
