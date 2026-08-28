/** Buzzard AI Guardian bridge (Python FastAPI service). */
const DEFAULT_TIMEOUT_MS = 8000;

function guardianBaseUrl() {
  let url = (process.env.BUZZARD_GUARDIAN_URL || "").replace(/\/$/, "");
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

function isGuardianConfigured() {
  return Boolean(guardianBaseUrl());
}

async function fetchGuardian(path, options = {}) {
  const base = guardianBaseUrl();
  if (!base) {
    return { ok: false, status: "NOT_CONFIGURED", error: "guardian_url_missing" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    return {
      ok: false,
      status: "UNREACHABLE",
      error: error.name === "AbortError" ? "guardian_timeout" : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getGuardianStatus() {
  if (!isGuardianConfigured()) {
    return {
      configured: false,
      reachable: false,
      guardianUrl: null,
      message: "Set BUZZARD_GUARDIAN_URL to connect the AI Guardian service.",
    };
  }

  const health = await fetchGuardian("/health");
  return {
    configured: true,
    reachable: health.ok,
    guardianUrl: guardianBaseUrl(),
    health: health.ok ? health.body : null,
    error: health.ok ? null : health.error || health.body,
  };
}

module.exports = {
  guardianBaseUrl,
  isGuardianConfigured,
  fetchGuardian,
  getGuardianStatus,
};
