/**
 * WORM/immutable backup. chmod 444 is local read-only, not object-lock.
 */
function assessWorm({
  objectLock = process.env.BUZZARD_WORM_OBJECT_LOCK === "1",
  provider = process.env.BUZZARD_WORM_PROVIDER || "",
  chmod444 = false,
} = {}) {
  if (chmod444 && !objectLock) {
    return {
      ok: false,
      worm: false,
      code: "CHMOD_IS_NOT_WORM",
      status: "BLOCKED",
    };
  }
  if (!provider || !objectLock) {
    return {
      ok: false,
      worm: false,
      code: "WORM_PROVIDER_MISSING",
      status: "BLOCKED",
      adapterReady: true,
    };
  }
  return {
    ok: false,
    worm: false,
    code: "WORM_NOT_LIVE_VERIFIED",
    status: "HUMAN_APPROVAL_REQUIRED",
    adapterReady: true,
  };
}

function putImmutable() {
  return { ok: false, stored: false, code: "WORM_WRITE_BLOCKED" };
}

module.exports = { assessWorm, putImmutable };
