/** Buzzard AI task orchestrator bridge (Python FastAPI service). */
const DEFAULT_TIMEOUT_MS = 8000;

function orchestratorBaseUrl() {
  let url = (process.env.BUZZARD_ORCHESTRATOR_URL || "").replace(/\/$/, "");
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

function isOrchestratorConfigured() {
  return Boolean(orchestratorBaseUrl());
}

async function fetchOrchestrator(path, options = {}) {
  const base = orchestratorBaseUrl();
  if (!base) {
    return { ok: false, status: "NOT_CONFIGURED", error: "orchestrator_url_missing" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
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
    return {
      ok: res.ok,
      status: res.status,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: "UNREACHABLE",
      error: error.name === "AbortError" ? "orchestrator_timeout" : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getOrchestratorStatus() {
  if (!isOrchestratorConfigured()) {
    return {
      configured: false,
      reachable: false,
      orchestratorUrl: null,
      message: "Set BUZZARD_ORCHESTRATOR_URL to connect the AI task orchestrator.",
    };
  }

  const health = await fetchOrchestrator("/health");
  return {
    configured: true,
    reachable: health.ok,
    orchestratorUrl: orchestratorBaseUrl(),
    health: health.ok ? health.body : null,
    error: health.ok ? null : health.error || health.body,
  };
}

module.exports = {
  orchestratorBaseUrl,
  isOrchestratorConfigured,
  fetchOrchestrator,
  getOrchestratorStatus,
};
