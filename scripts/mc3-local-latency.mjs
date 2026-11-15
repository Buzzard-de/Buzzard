#!/usr/bin/env node
const targets = [
  { name: "home", url: "http://127.0.0.1:3000/" },
  { name: "locale_pl", url: "http://127.0.0.1:3000/pl/" },
  { name: "products", url: "http://127.0.0.1:3000/products/" },
  { name: "api_health", url: "http://127.0.0.1:3001/api/health" },
];

const rows = [];
for (const target of targets) {
  const t0 = Date.now();
  try {
    const res = await fetch(target.url, { redirect: "follow" });
    rows.push({
      ...target,
      ms: Date.now() - t0,
      status: res.status,
      environment: "local-isolated",
    });
  } catch (err) {
    rows.push({
      ...target,
      ms: Date.now() - t0,
      status: 0,
      error: err.message,
      environment: "local-isolated",
    });
  }
}

console.log(JSON.stringify({ measured: true, liveProduction: false, rows }, null, 2));
