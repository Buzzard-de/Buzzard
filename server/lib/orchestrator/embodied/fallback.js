function resolveFallback({ liveAvatar, providerConfigured, providerWired, local3d } = {}) {
  if (liveAvatar) {
    return { mode: "REAL_AVATAR", live: true, userStatus: "live" };
  }
  if (providerConfigured && providerWired) {
    return { mode: "PROVIDER_FALLBACK", live: false, userStatus: "Avatar service unavailable" };
  }
  if (local3d) {
    return { mode: "LOCAL_3D_AVATAR", live: false, userStatus: "Avatar service unavailable" };
  }
  return { mode: "CSS_3D_FALLBACK", live: false, userStatus: "Avatar service unavailable" };
}

module.exports = { resolveFallback };
