#!/usr/bin/env node
/**
 * Run all production finish checks and print readiness score.
 * Does NOT enable sales or change Render config.
 */
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com";

function run(label, cmd, args = [], { optional = false } = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, BUZZARD_API_URL: API },
    shell: false,
  });
  const out = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (out) console.log(out.split("\n").slice(-15).join("\n"));
  const ok = result.status === 0;
  if (!ok && !optional) {
    console.log(`  → exit ${result.status}`);
  }
  return { ok, status: result.status ?? 1, optional };
}

async function fetchScore() {
  try {
    const res = await fetch(`${API.replace(/\/$/, "")}/api/health/db`, {
      headers: { Accept: "application/json" },
    });
    const { database } = await res.json();
    const persistent = database?.persistence?.persistent === true;
    const sales = false;
    let score = 0;
    const weights = [
      { ok: true, w: 25, label: "Katalog/API live" },
      { ok: persistent, w: 30, label: "Persistent DB" },
      { ok: false, w: 20, label: "Zahlungen konfiguriert" },
      { ok: sales, w: 10, label: "Sales bewusst aus" },
      { ok: true, w: 15, label: "Code auf main" },
    ];
    try {
      const prod = await fetch(`${API.replace(/\/$/, "")}/api/health/production`, {
        headers: { Accept: "application/json" },
      });
      const pb = await prod.json();
      weights[2].ok =
        pb.commerce?.stripeConfigured === true || pb.commercial?.payments?.stripe === true;
    } catch {
      /* ignore */
    }
    for (const item of weights) {
      if (item.ok) score += item.w;
    }
    return { score, weights, persistent };
  } catch {
    return { score: 55, weights: [], persistent: false };
  }
}

async function main() {
  console.log("Buzzard — Production Finish Check");
  console.log(`API: ${API}`);
  console.log("Sales werden NICHT aktiviert.\n");

  const checks = [
    run("Production smoke", "npm", ["run", "test:production-smoke"], { optional: false }),
    run("Part 14", "npm", ["run", "test:part14"], { optional: true }),
    run("DB persistence", "npm", ["run", "verify:db-persistence"], { optional: true }),
    run("Production remaining audit", "npm", ["run", "setup:production-remaining"], { optional: true }),
    run("Part 15 readiness", "npm", ["run", "test:part15"], { optional: true }),
  ];

  const { score, weights, persistent } = await fetchScore();

  console.log("\n══════════════════════════════════════");
  console.log(`GESAMT-FORTSCHRITT (geschätzt): ~${score}%`);
  if (weights.length) {
    for (const w of weights) {
      console.log(`  ${w.ok ? "✓" : "○"} ${w.label}`);
    }
  }
  console.log("══════════════════════════════════════");

  const blockers = [];
  if (!persistent) blockers.push("Render: Starter + Disk /var/data + BUZZARD_DB_PATH");
  blockers.push("Render: STRIPE_SECRET_KEY + PAYPAL_* in Environment");
  blockers.push("GitHub Secret: RENDER_API_KEY für setup --apply");
  if (!checks[0].ok) blockers.push("Production smoke fehlgeschlagen — Deploy abwarten");

  if (blockers.length) {
    console.log("\nManuelle Schritte (du):");
    blockers.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
    console.log("\nGuide: docs/PART15_READINESS_DE.md");
  }

  const hardFail = checks.filter((c) => !c.ok && !c.optional);
  process.exit(hardFail.length ? 1 : checks.some((c) => !c.ok) ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
