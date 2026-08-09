#!/usr/bin/env node
/**
 * Create or update the buzzard-api Render web service and wait for /api/health.
 * Requires RENDER_API_KEY (and optional RENDER_OWNER_ID).
 */

const API_BASE = "https://api.render.com/v1";
const SERVICE_NAME = "buzzard-api";
const REPO = "https://github.com/Buzzard-de/Buzzard";
const BRANCH = "main";
const HEALTH_PATH = "/api/health";
const TARGET_URL = "https://buzzard-api.onrender.com";

const ENV_VARS = [
  { key: "NODE_ENV", value: "production" },
  { key: "PORT", value: "10000" },
  { key: "BUZZARD_AI_CHAT_ENABLED", value: "1" },
  { key: "BUZZARD_DB_ENABLED", value: "1" },
  { key: "BUZZARD_COMMERCIAL_INTEGRATIONS", value: "1" },
  { key: "BUZZARD_ORDER_AUTOMATION", value: "1" },
  { key: "BUZZARD_SUPPLIER_HUB", value: "1" },
  { key: "BUZZARD_CATALOG_SEO", value: "1" },
  { key: "BUZZARD_LOCALIZATION_FEEDS", value: "1" },
  { key: "BUZZARD_CUSTOMER_CHECKOUT", value: "1" },
  { key: "BUZZARD_CUSTOMER_SUPPORT", value: "1" },
  { key: "BUZZARD_CRM_LOYALTY", value: "1" },
  { key: "BUZZARD_ANALYTICS_DASHBOARD", value: "1" },
  { key: "BUZZARD_MARKETING_CENTER", value: "1" },
  { key: "BUZZARD_MARKETPLACE_HUB", value: "1" },
  { key: "BUZZARD_LOGISTICS_FULFILLMENT", value: "1" },
  { key: "BUZZARD_WMS_INVENTORY", value: "1" },
  { key: "BUZZARD_PIM_CATALOG", value: "1" },
  { key: "BUZZARD_IDENTITY_SECURITY", value: "1" },
  { key: "BUZZARD_PAYMENTS_FINANCE", value: "1" },
  { key: "BUZZARD_ORDER_MANAGEMENT", value: "1" },
  { key: "BUZZARD_CART_CHECKOUT", value: "1" },
  { key: "BUZZARD_CRM_CUSTOMER_SERVICE", value: "1" },
  { key: "BUZZARD_RETURNS_RMA", value: "1" },
  { key: "BUZZARD_MARKETING_LOYALTY", value: "1" },
  { key: "BUZZARD_REVIEWS_RATINGS", value: "1" },
  { key: "BUZZARD_AI_CENTER", value: "1" },
  { key: "BUZZARD_ADVANCED_SEARCH", value: "1" },
  { key: "BUZZARD_PRODUCT_CATALOG_PIM", value: "1" },
  { key: "DEFAULT_PAYMENT_PROVIDER", value: "stripe" },
  { key: "DEFAULT_CARRIER", value: "dhl" },
  { key: "ADMIN_EMAIL", value: "admin@buzzard.de" },
  { key: "JWT_SECRET", generateValue: true },
  { key: "ADMIN_PASSWORD", generateValue: true },
];

function requireApiKey() {
  const key = process.env.RENDER_API_KEY?.trim();
  if (!key) {
    console.error("Missing RENDER_API_KEY.");
    console.error("Create one at https://dashboard.render.com/u/settings#api-keys");
    process.exit(1);
  }
  return key;
}

async function renderFetch(apiKey, path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Render API ${options.method || "GET"} ${path} failed (${response.status}): ${detail}`);
  }

  return data;
}

function unwrapList(items) {
  if (!Array.isArray(items)) return [];
  return items.map((entry) => entry.service || entry.owner || entry.deploy || entry);
}

async function listOwners(apiKey) {
  const owners = unwrapList(await renderFetch(apiKey, "/owners?limit=20"));
  if (process.env.RENDER_OWNER_ID) {
    const selected = owners.find((owner) => owner.id === process.env.RENDER_OWNER_ID);
    if (!selected) {
      throw new Error(`RENDER_OWNER_ID ${process.env.RENDER_OWNER_ID} not found in /owners`);
    }
    return selected;
  }
  if (!owners.length) {
    throw new Error("No Render workspace found for this API key.");
  }
  return owners[0];
}

async function findService(apiKey) {
  let cursor = "";
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ limit: "100", name: SERVICE_NAME });
    if (cursor) query.set("cursor", cursor);
    const rows = await renderFetch(apiKey, `/services?${query.toString()}`);
    const services = unwrapList(rows);
    const match = services.find((service) => service.name === SERVICE_NAME);
    if (match) return match;

    const last = Array.isArray(rows) ? rows[rows.length - 1] : null;
    cursor = last?.cursor || "";
    if (!cursor) break;
  }
  return null;
}

function createServicePayload(ownerId) {
  return {
    type: "web_service",
    name: SERVICE_NAME,
    ownerId,
    repo: REPO,
    branch: BRANCH,
    autoDeploy: "yes",
    rootDir: ".",
    envVars: ENV_VARS,
    serviceDetails: {
      runtime: "node",
      plan: "free",
      region: "frankfurt",
      healthCheckPath: HEALTH_PATH,
      envSpecificDetails: {
        buildCommand: "cd server && npm ci",
        startCommand: "node server/server.js",
      },
    },
  };
}

async function triggerDeploy(apiKey, serviceId) {
  return renderFetch(apiKey, `/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
}

async function getService(apiKey, serviceId) {
  return renderFetch(apiKey, `/services/${serviceId}`);
}

function serviceUrl(service) {
  return service?.serviceDetails?.url || TARGET_URL;
}

async function waitForHealth(baseUrl, timeoutMs = 15 * 60 * 1000) {
  const healthUrl = `${baseUrl.replace(/\/$/, "")}${HEALTH_PATH}`;
  const started = Date.now();
  let attempt = 0;

  while (Date.now() - started < timeoutMs) {
    attempt += 1;
    try {
      const response = await fetch(healthUrl, { headers: { Accept: "application/json" } });
      if (response.ok) {
        const body = await response.text();
        console.log(`Health check OK (${response.status}) on attempt ${attempt}: ${body.slice(0, 240)}`);
        return true;
      }
      console.log(`Health check pending (${response.status}) attempt ${attempt}…`);
    } catch (error) {
      console.log(`Health check pending attempt ${attempt}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(15000, 5000 + attempt * 1000)));
  }

  return false;
}

async function main() {
  const apiKey = requireApiKey();
  let service = await findService(apiKey);

  if (!service) {
    const owner = await listOwners(apiKey);
    console.log(`Creating ${SERVICE_NAME} in workspace ${owner.name || owner.id}…`);
    const created = await renderFetch(apiKey, "/services", {
      method: "POST",
      body: JSON.stringify(createServicePayload(owner.id)),
    });
    service = created.service || created;
    console.log(`Created service ${service.id} (${service.name}).`);
  } else {
    console.log(`Found existing service ${service.id} (${service.name}).`);
  }

  console.log("Triggering deploy…");
  await triggerDeploy(apiKey, service.id);

  const latest = await getService(apiKey, service.id);
  const url = serviceUrl(latest);
  console.log(`Service URL: ${url}`);
  console.log("Waiting for health check (Render free tier may take several minutes on cold start)…");

  const healthy = await waitForHealth(url);
  if (!healthy) {
    console.error(`Timed out waiting for ${url}${HEALTH_PATH}`);
    process.exit(1);
  }

  console.log("");
  console.log("Render API is live.");
  console.log(`Health: ${url}${HEALTH_PATH}`);
  console.log("");
  console.log("Optional: add the deploy hook URL from Render dashboard as GitHub secret RENDER_DEPLOY_HOOK_URL");
  console.log("(Service → Settings → Deploy Hook) so push deploys trigger automatically.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
