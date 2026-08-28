#!/usr/bin/env node
/** P1 Wave 2 — SEO + i18n smoke (tasks 12–13). Does not repeat p1-smoke.mjs checks. */

const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

const checks = [];

async function run(name, fn) {
  try {
    const ok = await fn();
    checks.push({ name, ok });
    console.log(`${ok ? "✓" : "✗"} ${name}`);
  } catch (e) {
    checks.push({ name, ok: false });
    console.log(`✗ ${name} — ${e.message}`);
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  console.log(`P1 SEO/i18n smoke — ${SITE} + ${API}\n`);

  await run("sitemap.xml", async () => {
    const res = await fetch(`${SITE}/sitemap.xml`);
    const text = await res.text();
    return res.ok && text.includes("<urlset");
  });

  await run("robots.txt + sitemap ref", async () => {
    const res = await fetch(`${SITE}/robots.txt`);
    const text = await res.text();
    return res.ok && text.includes("sitemap");
  });

  await run("API /api/p1/seo/status", async () => {
    const { ok, body } = await fetchJson(`${API}/api/p1/seo/status`);
    return ok && body.report?.infrastructure?.sitemap;
  });

  await run("API /api/p1/i18n/gaps", async () => {
    const { ok, body } = await fetchJson(`${API}/api/p1/i18n/gaps`);
    return ok && Array.isArray(body.report?.locales);
  });

  await run("merchant feed XML", async () => {
    const res = await fetch(`${API}/api/localization/feed/google.xml`);
    const text = await res.text();
    return res.ok && (text.includes("<rss") || text.includes("<?xml"));
  });

  await run("locale /en/", async () => {
    const res = await fetch(`${SITE}/en/`);
    return res.ok;
  });

  await run("locale /tr/", async () => {
    const res = await fetch(`${SITE}/tr/`);
    return res.ok;
  });

  await run("locale /ar/", async () => {
    const res = await fetch(`${SITE}/ar/`);
    return res.ok;
  });

  const passed = checks.filter((c) => c.ok).length;
  console.log(`\n${passed}/${checks.length} passed`);
  if (passed < checks.length) process.exit(1);
}

main();
