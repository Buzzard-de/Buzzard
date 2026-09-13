#!/usr/bin/env node
/**
 * BUZZARD #328 — Analytics KPI production runtime QA
 */
import { spawnSync } from "node:child_process";

const API = process.env.BUZZARD_API_URL || "http://localhost:3001";
const STATIC = process.env.BUZZARD_SITE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@buzzard.de";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "BuzzardAdmin2026!";

const results = [];
let token = "";

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function main() {
  console.log("\n=== Analytics Production QA (#328) ===\n");

  // Static export page
  const pageRes = await fetch(`${STATIC}/admin/analytics-foundation/`);
  if (pageRes.status === 200) pass("Static export: /admin/analytics-foundation/", `status ${pageRes.status}`);
  else fail("Static export: /admin/analytics-foundation/", `status ${pageRes.status}`);

  const html = await pageRes.text();
  if (html.includes("Analytics Intelligence") || html.includes("analytics-foundation")) {
    pass("Static export HTML contains analytics foundation content");
  } else {
    fail("Static export HTML missing expected content");
  }

  // Auth
  const login = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  token = login.json?.token;
  if (login.status === 200 && token) pass("Admin JWT login");
  else fail("Admin JWT login", JSON.stringify(login.json));

  const authHeaders = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  // Unauthenticated KPI
  const unauth = await fetchJson("/api/admin/analytics-foundation/kpis");
  if (unauth.status === 403 || unauth.status === 401) pass("KPI API rejects unauthenticated", String(unauth.status));
  else fail("KPI API rejects unauthenticated", `status ${unauth.status}`);

  // KPI success
  const kpis = await fetchJson("/api/admin/analytics-foundation/kpis?range=last_30_days&comparePrevious=true&limit=10", {
    headers: authHeaders,
  });
  if (kpis.status === 200 && kpis.json?.success && kpis.json?.data?.executive) {
    pass("KPI API authenticated success", `orders=${kpis.json.data.executive.orders}`);
  } else fail("KPI API authenticated success", JSON.stringify(kpis.json).slice(0, 200));

  // Invalid limit
  const badLimit = await fetchJson("/api/admin/analytics-foundation/kpis?limit=999", { headers: authHeaders });
  if (badLimit.status === 400) pass("KPI API rejects invalid limit", "400");
  else fail("KPI API rejects invalid limit", `status ${badLimit.status}`);

  // Invalid custom range
  const badRange = await fetchJson("/api/admin/analytics-foundation/kpis?range=custom", { headers: authHeaders });
  if (badRange.status === 400) pass("KPI API rejects invalid custom range", "400");
  else fail("KPI API rejects invalid custom range", `status ${badRange.status}`);

  // Section filter
  const funnelSection = await fetchJson("/api/admin/analytics-foundation/kpis?section=funnel", { headers: authHeaders });
  if (funnelSection.status === 200 && funnelSection.json?.data?.funnel) pass("KPI section=funnel");
  else fail("KPI section=funnel");

  // Overview regression
  const overview = await fetchJson("/api/admin/analytics-foundation/overview", { headers: authHeaders });
  if (overview.status === 200 && overview.json?.success) pass("Overview endpoint regression");
  else fail("Overview endpoint regression", `status ${overview.status}`);

  // Funnel regression
  const funnel = await fetchJson("/api/admin/analytics-foundation/funnel", { headers: authHeaders });
  if (funnel.status === 200 && funnel.json?.success) pass("Funnel endpoint regression");
  else fail("Funnel endpoint regression", `status ${funnel.status}`);

  // PII check on KPI response
  const kpiStr = JSON.stringify(kpis.json?.data || {});
  const piiPatterns = ["@", "password", "phone", "street", "credit_card"];
  const piiHit = piiPatterns.find((p) => kpiStr.toLowerCase().includes(p) && !kpiStr.includes("@type"));
  if (!piiHit) pass("KPI response has no obvious PII");
  else fail("KPI response PII check", `matched ${piiHit}`);

  // Markets count
  if (kpis.json?.data?.markets?.length === 35) pass("35 markets in KPI response");
  else fail("35 markets in KPI response", `count=${kpis.json?.data?.markets?.length}`);

  // Profitability authoritative flag
  if (kpis.json?.data?.profitability?.authoritativeOnly === true) pass("Profitability authoritativeOnly flag");
  else fail("Profitability authoritativeOnly flag");

  // Post analytics event + authoritative purchase via API
  const eventBody = {
    eventType: "PAGE_VIEW",
    anonymousVisitorId: "qa_visitor_328",
    sessionId: "qa_session_328",
    market: "DE",
    language: "de",
    pagePath: "/qa-test",
    consentState: { consentRequired: false, consentStatus: "GRANTED", analytics: "GRANTED" },
  };
  const evt = await fetchJson("/api/analytics/foundation/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventBody),
  });
  if (evt.status === 202) pass("Analytics event ingestion", "PAGE_VIEW");
  else fail("Analytics event ingestion", `status ${evt.status}`);

  // Restart persistence test via node script
  const restartTest = spawnSync("node", ["scripts/analytics-restart-qa.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, BUZZARD_API_URL: API, ADMIN_EMAIL, ADMIN_PASSWORD },
    encoding: "utf8",
  });
  if (restartTest.status === 0) pass("SQLite restart + idempotency QA");
  else fail("SQLite restart + idempotency QA", restartTest.stderr?.slice(0, 300) || restartTest.stdout?.slice(0, 300));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===\n`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
