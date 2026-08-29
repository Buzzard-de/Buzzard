#!/usr/bin/env node
/**
 * Apply remaining production setup: persistent disk, Redis env, audit live stack.
 *
 * Usage:
 *   node scripts/setup-production-remaining.mjs           # audit only
 *   RENDER_API_KEY=... node scripts/setup-production-remaining.mjs --apply
 *
 * Manual (no API key): Render Dashboard → Blueprint sync from main render.yaml
 */

const API_BASE = "https://api.render.com/v1";
const SERVICE_NAME = "buzzard-api";
const TARGET_URL = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");
const SITE_URL = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");

const DISK = { name: "buzzard-data", mountPath: "/var/data", sizeGB: 1 };
const ENV_TO_SET = [
  { key: "BUZZARD_DB_PATH", value: "/var/data/buzzard.db" },
  { key: "BUZZARD_BACKUP_DIR", value: "/var/data/backups" },
  { key: "BUZZARD_SALES_ENABLED", value: "0" },
  { key: "BUZZARD_RATE_LIMIT_STORE", value: "redis" },
];

const apply = process.argv.includes("--apply");

function log(section, msg) {
  console.log(`[${section}] ${msg}`);
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
    throw new Error(`Render API ${options.method || "GET"} ${path} (${response.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

function unwrapList(items) {
  if (!Array.isArray(items)) return [];
  return items.map((entry) => entry.service || entry.disk || entry.envVar || entry);
}

async function findService(apiKey) {
  const rows = await renderFetch(apiKey, `/services?name=${encodeURIComponent(SERVICE_NAME)}&limit=20`);
  const services = unwrapList(rows);
  return services.find((s) => s.name === SERVICE_NAME) || null;
}

async function listDisks(apiKey, serviceId) {
  const rows = await renderFetch(apiKey, `/services/${serviceId}/disks?limit=20`);
  return unwrapList(rows);
}

async function listEnvVars(apiKey, serviceId) {
  const rows = await renderFetch(apiKey, `/services/${serviceId}/env-vars?limit=100`);
  return unwrapList(rows);
}

async function upsertEnvVar(apiKey, serviceId, key, value) {
  const existing = await listEnvVars(apiKey, serviceId);
  const match = existing.find((v) => v.key === key);
  if (match?.id) {
    await renderFetch(apiKey, `/services/${serviceId}/env-vars/${match.id}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
    return "updated";
  }
  await renderFetch(apiKey, `/services/${serviceId}/env-vars`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
  return "created";
}

async function triggerDeploy(apiKey, serviceId) {
  await renderFetch(apiKey, `/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
}

async function auditLive() {
  log("audit", `API: ${TARGET_URL}`);
  const checks = [
    ["/api/health/version", "version"],
    ["/api/health/db", "database"],
    ["/api/health/production", "production"],
    ["/api/intelligence/status", "intelligence"],
    ["/api/security/health", "security"],
    ["/api/p1/seo/status", "seo"],
  ];

  const report = {};
  for (const [path, label] of checks) {
    try {
      const res = await fetch(`${TARGET_URL}${path}`, { headers: { Accept: "application/json" } });
      report[label] = { ok: res.ok, status: res.status, body: res.ok ? await res.json() : null };
    } catch (error) {
      report[label] = { ok: false, error: error.message };
    }
  }

  const persistent = report.database?.body?.database?.persistence?.persistent === true;
  const drift = report.production?.body?.deployment?.drift;
  const bridge = report.intelligence?.body?.bridge;
  const rateBackend = report.security?.body?.rateLimit?.backend;

  log("audit", `persistent DB: ${persistent ? "YES" : "NO (ephemeral)"}`);
  log("audit", `deployment drift: ${drift === false ? "false" : drift ?? "unknown"}`);
  log("audit", `intelligence bridge: ${bridge ?? "unknown"}`);
  log("audit", `rate limit backend: ${rateBackend ?? "unknown"}`);

  try {
    const gsc = await fetch(`${SITE_URL}/google1206d6d713142108.html`);
    log("audit", `Google verification file: ${gsc.ok ? "LIVE" : `HTTP ${gsc.status}`}`);
  } catch (error) {
    log("audit", `Google verification file: unreachable (${error.message})`);
  }

  return { report, persistent, bridge, rateBackend };
}

async function applyRender(apiKey) {
  const service = await findService(apiKey);
  if (!service?.id) throw new Error(`Service ${SERVICE_NAME} not found`);

  log("render", `Service ${service.id} plan=${service.serviceDetails?.plan ?? "?"}`);

  const plan = service.serviceDetails?.plan;
  if (plan === "free") {
    log("render", "Upgrading plan free → starter (enables persistent disk)…");
    await renderFetch(apiKey, `/services/${service.id}`, {
      method: "PATCH",
      body: JSON.stringify({ serviceDetails: { plan: "starter" } }),
    });
  } else {
    log("render", `Plan already ${plan} — skip upgrade`);
  }

  const disks = await listDisks(apiKey, service.id);
  const hasDisk = disks.some((d) => d.mountPath === DISK.mountPath);
  if (!hasDisk) {
    log("render", `Adding disk ${DISK.mountPath} (${DISK.sizeGB} GB)…`);
    await renderFetch(apiKey, "/disks", {
      method: "POST",
      body: JSON.stringify({ ...DISK, serviceId: service.id }),
    });
  } else {
    log("render", `Disk already mounted at ${DISK.mountPath}`);
  }

  for (const { key, value } of ENV_TO_SET) {
    const action = await upsertEnvVar(apiKey, service.id, key, value);
    log("render", `Env ${key} ${action}`);
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    await upsertEnvVar(apiKey, service.id, "UPSTASH_REDIS_REST_URL", process.env.UPSTASH_REDIS_REST_URL);
    await upsertEnvVar(apiKey, service.id, "UPSTASH_REDIS_REST_TOKEN", process.env.UPSTASH_REDIS_REST_TOKEN);
    log("render", "Upstash Redis credentials applied");
  } else {
    log("render", "Upstash not in env — rate limit falls back to memory until credentials set in Render");
  }

  log("render", "Triggering deploy…");
  await triggerDeploy(apiKey, service.id);

  log("render", "Waiting for persistent DB (may take 3–8 min on Starter)…");
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15000));
    const { persistent } = await auditLive();
    if (persistent) {
      log("render", "Persistent disk active");
      return;
    }
  }
  log("render", "Deploy still in progress — re-run audit later");
}

function printManualSteps() {
  console.log("");
  console.log("=== Manuelle Schritte (Dashboard) ===");
  console.log("");
  console.log("1. Render Blueprint sync (falls kein RENDER_API_KEY):");
  console.log("   https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard");
  console.log("   → starter + disk /var/data werden aus render.yaml übernommen");
  console.log("");
  console.log("2. Upstash Redis (Free): https://console.upstash.com/");
  console.log("   → REST URL + Token in Render → buzzard-api → Environment");
  console.log("");
  console.log("3. Admin-Passwort: Render → buzzard-api → Environment → ADMIN_PASSWORD");
  console.log("   Login: https://buzzard24.de/admin/login/ (admin@buzzard24.de)");
  console.log("");
  console.log("4. Google Search Console:");
  console.log("   https://search.google.com/search-console");
  console.log("   → Property buzzard24.de → HTML-Datei bereits live:");
  console.log(`   ${SITE_URL}/google1206d6d713142108.html`);
  console.log("   → Sitemap: https://buzzard24.de/sitemap.xml");
  console.log("");
  console.log("5. Cloudflare (optional): docs/CLOUDFLARE_SETUP_DE.md");
  console.log("   → IONOS Nameserver auf Cloudflare umstellen");
  console.log("");
}

async function main() {
  console.log("Buzzard — remaining production setup");
  console.log(`Mode: ${apply ? "APPLY (Render API)" : "AUDIT ONLY"}`);
  console.log("");

  const audit = await auditLive();

  if (apply) {
    const apiKey = process.env.RENDER_API_KEY?.trim();
    if (!apiKey) {
      console.error("Missing RENDER_API_KEY for --apply");
      printManualSteps();
      process.exit(1);
    }
    await applyRender(apiKey);
  }

  printManualSteps();

  if (!audit.persistent && !apply) {
    console.log("");
    console.log("Tipp: RENDER_API_KEY=... node scripts/setup-production-remaining.mjs --apply");
    console.log("oder Blueprint sync im Render Dashboard.");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
