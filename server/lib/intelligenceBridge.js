const DEFAULT_TIMEOUT_MS = Number(process.env.BUZZARD_INTELLIGENCE_TIMEOUT_MS || 5000);

function intelligenceBaseUrl() {
  return (process.env.BUZZARD_INTELLIGENCE_API_URL || "").replace(/\/$/, "");
}

function isBridgeEnabled() {
  if (process.env.BUZZARD_INTELLIGENCE_BRIDGE === "0") return false;
  return Boolean(intelligenceBaseUrl());
}

async function fetchIntelligence(path) {
  const base = intelligenceBaseUrl();
  if (!base) {
    return { ok: false, status: "NOT_CONFIGURED", error: "intelligence_api_url_missing" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, status: "DOWN", error: `http_${response.status}` };
    }
    const data = await response.json();
    return { ok: true, status: "LIVE", data };
  } catch (error) {
    return {
      ok: false,
      status: "DOWN",
      error: error instanceof Error ? error.message : "fetch_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function getBridgeStatus() {
  const { isSalesEnabled } = require("./salesMode");
  const base = intelligenceBaseUrl();

  if (!isBridgeEnabled()) {
    return {
      bridge: "NOT_CONFIGURED",
      intelligenceApiUrl: base || null,
      salesEnabled: isSalesEnabled(),
      catalogMode: !isSalesEnabled(),
      message: "Set BUZZARD_INTELLIGENCE_API_URL to connect the Python intelligence stack.",
    };
  }

  const [health, readiness, integrations] = await Promise.all([
    fetchIntelligence("/health"),
    fetchIntelligence("/production/readiness"),
    fetchIntelligence("/production/integrations"),
  ]);

  return {
    bridge: health.ok ? "LIVE" : "DOWN",
    intelligenceApiUrl: base,
    salesEnabled: isSalesEnabled(),
    catalogMode: !isSalesEnabled(),
    health: health.ok ? health.data : { error: health.error },
    production: {
      readiness: readiness.ok ? readiness.data : { error: readiness.error },
      integrations: integrations.ok ? integrations.data : { error: integrations.error },
    },
  };
}

module.exports = {
  intelligenceBaseUrl,
  isBridgeEnabled,
  fetchIntelligence,
  getBridgeStatus,
};
