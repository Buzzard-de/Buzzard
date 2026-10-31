#!/usr/bin/env node
/**
 * Sequential + small concurrent probes. Do not use as a flood tool.
 */
const base = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");
const site = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");

async function timeOne(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "BuzzardSpeedMeasure/1" } });
    await res.arrayBuffer();
    return { ms: Date.now() - started, status: res.status };
  } catch (error) {
    return { ms: Date.now() - started, status: 0, error: error.message };
  }
}

function summarize(rows) {
  const ok = rows.filter((row) => row.status >= 200 && row.status < 400);
  const times = ok.map((row) => row.ms).sort((a, b) => a - b);
  const mid = times[Math.floor(times.length / 2)] || null;
  const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  return {
    samples: rows.length,
    ok: ok.length,
    p50Ms: mid,
    meanMs: mean ? Math.round(mean) : null,
    sequentialRps: mean ? Number((1000 / mean).toFixed(1)) : null,
  };
}

async function sequential(url, n) {
  const rows = [];
  for (let i = 0; i < n; i += 1) rows.push(await timeOne(url));
  return summarize(rows);
}

async function concurrent(url, n) {
  const rows = await Promise.all(Array.from({ length: n }, () => timeOne(url)));
  const wall = Math.max(...rows.map((row) => row.ms));
  const summary = summarize(rows);
  return { ...summary, wallMs: wall, concurrentRps: wall ? Number(((summary.ok * 1000) / wall).toFixed(1)) : null };
}

async function main() {
  const health = `${base}/api/health`;
  const search = `${base}/api/vehicle-parts/search?q=1K0698151&categoryId=cat-05`;
  const page = `${site}/kategorie/automotive/`;
  const report = {
    at: new Date().toISOString(),
    base,
    healthSequential: await sequential(health, 12),
    searchSequential: await sequential(search, 12),
    pageSequential: await sequential(page, 8),
    searchConcurrent10: await concurrent(search, 10),
    healthConcurrent10: await concurrent(health, 10),
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
