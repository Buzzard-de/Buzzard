const DEFAULT_TIMEOUT_MS = Number(process.env.BUZZARD_INTELLIGENCE_TIMEOUT_MS || 5000);
const embedded = require("./embeddedIntelligence");

function intelligenceBaseUrl() {
  return (process.env.BUZZARD_INTELLIGENCE_API_URL || "").replace(/\/$/, "");
}

function isBridgeEnabled() {
  if (process.env.BUZZARD_INTELLIGENCE_BRIDGE === "0") return false;
  if (intelligenceBaseUrl()) return true;
  return embedded.isEmbeddedIntelligenceEnabled();
}

function embeddedBridgeStatus() {
  const { isSalesEnabled } = require("./salesMode");
  return {
    bridge: "EMBEDDED",
    intelligenceApiUrl: null,
    embedded: true,
    salesEnabled: isSalesEnabled(),
    catalogMode: !isSalesEnabled(),
    health: embedded.health(),
    production: {
      readiness: embedded.productionReadiness(),
      integrations: embedded.productionIntegrations(),
    },
    shopBridge: embedded.shopBridgeReadiness(),
    taxonomy: embedded.taxonomySnapshot(),
    message:
      "Embedded intelligence active on Node API. Set BUZZARD_INTELLIGENCE_API_URL for full Python stack.",
  };
}

async function fetchIntelligence(path) {
  const base = intelligenceBaseUrl();
  if (!base) {
    if (!embedded.isEmbeddedIntelligenceEnabled()) {
      return { ok: false, status: "NOT_CONFIGURED", error: "intelligence_api_url_missing" };
    }
    const routes = {
      "/health": embedded.health(),
      "/production/readiness": embedded.productionReadiness(),
      "/production/integrations": embedded.productionIntegrations(),
      "/shop-bridge/readiness": embedded.shopBridgeReadiness(),
      "/taxonomy/snapshot": embedded.taxonomySnapshot(),
    };
    const data = routes[path];
    if (data) {
      return { ok: true, status: "EMBEDDED", data };
    }
    return { ok: false, status: "EMBEDDED", error: `embedded_route_missing:${path}` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      if (embedded.isEmbeddedIntelligenceEnabled()) {
        const fallback = await fetchIntelligenceEmbedded(path);
        if (fallback.ok) return fallback;
      }
      return { ok: false, status: "DOWN", error: `http_${response.status}` };
    }
    const data = await response.json();
    return { ok: true, status: "LIVE", data };
  } catch (error) {
    if (embedded.isEmbeddedIntelligenceEnabled()) {
      const fallback = await fetchIntelligenceEmbedded(path);
      if (fallback.ok) return fallback;
    }
    return {
      ok: false,
      status: "DOWN",
      error: error instanceof Error ? error.message : "fetch_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIntelligenceEmbedded(path) {
  const routes = {
    "/health": embedded.health(),
    "/production/readiness": embedded.productionReadiness(),
    "/production/integrations": embedded.productionIntegrations(),
    "/shop-bridge/readiness": embedded.shopBridgeReadiness(),
    "/taxonomy/snapshot": embedded.taxonomySnapshot(),
  };
  const data = routes[path];
  if (!data) {
    return { ok: false, status: "EMBEDDED", error: `embedded_route_missing:${path}` };
  }
  return { ok: true, status: "EMBEDDED", data };
}

async function getBridgeStatus() {
  const { isSalesEnabled } = require("./salesMode");
  const base = intelligenceBaseUrl();

  if (!base && embedded.isEmbeddedIntelligenceEnabled()) {
    return embeddedBridgeStatus();
  }

  if (!isBridgeEnabled()) {
    return {
      bridge: "NOT_CONFIGURED",
      intelligenceApiUrl: base || null,
      salesEnabled: isSalesEnabled(),
      catalogMode: !isSalesEnabled(),
      message: "Set BUZZARD_INTELLIGENCE_API_URL to connect the Python intelligence stack.",
    };
  }

  const [health, readiness, shopBridge, integrations] = await Promise.all([
    fetchIntelligence("/health"),
    fetchIntelligence("/production/readiness"),
    fetchIntelligence("/shop-bridge/readiness"),
    fetchIntelligence("/production/integrations"),
  ]);

  const bridgeStatus = health.ok ? health.status : "DOWN";

  return {
    bridge: bridgeStatus === "EMBEDDED" ? "EMBEDDED" : bridgeStatus === "LIVE" ? "LIVE" : "DOWN",
    intelligenceApiUrl: base || null,
    embedded: bridgeStatus === "EMBEDDED",
    salesEnabled: isSalesEnabled(),
    catalogMode: !isSalesEnabled(),
    health: health.ok ? health.data : { error: health.error },
    production: {
      readiness: readiness.ok ? readiness.data : { error: readiness.error },
      integrations: integrations.ok ? integrations.data : { error: integrations.error },
    },
    shopBridge: shopBridge.ok ? shopBridge.data : { error: shopBridge.error },
  };
}

module.exports = {
  intelligenceBaseUrl,
  isBridgeEnabled,
  fetchIntelligence,
  getBridgeStatus,
  embeddedBridgeStatus,
};
