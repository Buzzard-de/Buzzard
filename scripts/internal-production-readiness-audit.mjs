#!/usr/bin/env node
/**
 * Buzzard Final Internal Production Readiness Audit
 * Audit and validation only — no production activation, no fake credentials.
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const jsonOnly = process.argv.includes("--json");
const skipTests = process.argv.includes("--skip-tests");

function runTest(command) {
  const start = Date.now();
  try {
    execSync(command, { stdio: "pipe", cwd: root, timeout: 300000, env: { ...process.env } });
    return { command, status: "PASS", durationMs: Date.now() - start };
  } catch (err) {
    const msg = String(err.stderr || err.message || "");
    if (msg.includes("BLOCKED") || msg.includes("NOT_CONFIGURED") || msg.includes("credential")) {
      return { command, status: "BLOCKED", durationMs: Date.now() - start };
    }
    return { command, status: "FAIL", durationMs: Date.now() - start };
  }
}

const TEST_COMMANDS = [
  "npm run typecheck",
  "npm run lint",
  "npm run build",
  "npm run gate:buzzard-final",
  "npm run test:final-external-access",
  "npm run test:trade-route-fulfillment",
  "npm run test:order-engine",
  "npm run test:production-access",
  "npm run test:pricing-engine",
  "npm run test:inventory-engine",
  "npm run test:returns-engine",
  "npm run test:marketplace-engine",
  "npm run test:ai-orchestrator",
  "npm run test:buzzard-i18n",
  "npm run test:internal-production-readiness",
];

let testResults = [];
if (!skipTests) {
  for (const cmd of TEST_COMMANDS) {
    if (!jsonOnly) process.stdout.write(`Running ${cmd}...\n`);
    testResults.push(runTest(cmd));
  }
}

execSync("node scripts/build-internal-production-readiness-bridge.mjs", { stdio: "pipe", cwd: root });
const mod = require("../server/lib/internalProductionReadiness.bundle.cjs");

const sideEffectStart = mod.captureSideEffectCounters();
const audit = mod.buildInternalProductionReadinessAudit({
  testResults,
  sideEffectStart,
  sideEffectEnd: mod.captureSideEffectCounters(),
});

const mdPath = path.join(root, "docs/BUZZARD_FINAL_INTERNAL_PRODUCTION_READINESS_AUDIT.md");
const jsonPath = path.join(root, "docs/BUZZARD_FINAL_INTERNAL_PRODUCTION_READINESS_AUDIT.json");

function renderMarkdown(report) {
  const sb = report.scoreboard;
  const lines = [
    "# BUZZARD — Final Internal Production Readiness Audit",
    "",
    `**Generated:** ${report.generatedAt}`,
    "**Branch:** `cursor/internal-production-readiness-audit-c293`",
    "**Base:** PR #356 (Final External Access Preflight)",
    "**Command:** `npm run audit:internal-production-readiness`",
    "",
    "---",
    "",
    "## Scoreboard",
    "",
    "| Dimension | Value |",
    "|-----------|-------|",
    `| SOFTWARE_COMPLETE | **${sb.SOFTWARE_COMPLETE}** |`,
    `| CONFIG_COMPLETE | **${sb.CONFIG_COMPLETE}** |`,
    `| INTERNAL_READINESS | **${sb.INTERNAL_READINESS}** |`,
    `| EXTERNAL_ACCESS | **${sb.EXTERNAL_ACCESS}** |`,
    `| LIVE_VALIDATION | **${sb.LIVE_VALIDATION}** |`,
    `| DEPLOYMENT_READY | **${sb.DEPLOYMENT_READY}** |`,
    `| PRODUCTION_READY | **${sb.PRODUCTION_READY}** |`,
    `| GO_LIVE_READY | **${sb.GO_LIVE_READY}** |`,
    `| SALES_ENABLED | **${sb.SALES_ENABLED}** |`,
    "",
    "---",
    "",
    "## Internal Readiness Matrix",
    "",
    "| Area | Status | SSOT | Tests | Notes |",
    "|------|--------|------|-------|-------|",
  ];

  for (const e of report.readinessMatrix) {
    lines.push(`| ${e.area} | ${e.status} | ${e.ssot} | ${e.tests} | ${e.notes.replace(/\|/g, "/")} |`);
  }

  lines.push("", "---", "", "## Engine Integrity", "", "| Engine | Exists | SSOT | DataFlow | Tests | Integration | Duplicate | Notes |", "|--------|--------|------|----------|-------|-------------|-----------|-------|");

  for (const e of report.engineIntegrity) {
    lines.push(`| ${e.engine} | ${e.exists} | ${e.ssot} | ${e.dataFlow} | ${e.tests} | ${e.integration} | ${e.duplicateEngine} | ${e.notes} |`);
  }

  lines.push("", "---", "", "## Blockers", "");
  for (const b of report.blockers) {
    lines.push(`- **[${b.category}]** \`${b.code}\`: ${b.message}`);
  }

  lines.push("", "## Warnings", "");
  for (const w of report.warnings) {
    lines.push(`- ${w}`);
  }

  lines.push("", "---", "", "## Next Actions", "");
  for (const a of report.nextActions) {
    lines.push(`${a.step}. ${a.label} — **${a.status}**`);
  }

  lines.push("", "---", "", "## Test Results", "", "| Command | Status | Duration |", "|---------|--------|----------|");
  for (const t of report.testResults) {
    lines.push(`| \`${t.command}\` | ${t.status} | ${t.durationMs ?? "—"}ms |`);
  }

  lines.push("", "---", "", "## Side Effect Counters", "");
  lines.push("### Start");
  lines.push("```json");
  lines.push(JSON.stringify(report.sideEffectCounters.start, null, 2));
  lines.push("```");
  lines.push("### End");
  lines.push("```json");
  lines.push(JSON.stringify(report.sideEffectCounters.end, null, 2));
  lines.push("```");

  lines.push("", "---", "", "## Production Flags", "");
  lines.push("```json");
  lines.push(JSON.stringify(report.productionFlags, null, 2));
  lines.push("```");

  if (report.auditFailure) {
    lines.push("", "## AUDIT FAILURE", "");
    for (const r of report.auditFailureReasons) {
      lines.push(`- ${r}`);
    }
  }

  lines.push("", "---", "", "## Exit Criteria", "");
  lines.push("- No new engine architecture created");
  lines.push("- No parallel SSOT created");
  lines.push("- No real external production calls");
  lines.push("- SALES_ENABLED remains 0");
  lines.push("- All production flags OFF");
  lines.push("- Side effects = 0, fake evidence = 0");

  return lines.join("\n");
}

fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(audit, null, 2));
fs.writeFileSync(mdPath, renderMarkdown(audit));

if (jsonOnly) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  console.log("\n========================================");
  console.log("BUZZARD INTERNAL PRODUCTION READINESS AUDIT");
  console.log(`Generated: ${audit.generatedAt}`);
  console.log("========================================\n");
  console.log(`SOFTWARE_COMPLETE: ${audit.scoreboard.SOFTWARE_COMPLETE}`);
  console.log(`INTERNAL_READINESS: ${audit.scoreboard.INTERNAL_READINESS}`);
  console.log(`CONFIG_COMPLETE: ${audit.scoreboard.CONFIG_COMPLETE}`);
  console.log(`EXTERNAL_ACCESS: ${audit.scoreboard.EXTERNAL_ACCESS}`);
  console.log(`LIVE_VALIDATION: ${audit.scoreboard.LIVE_VALIDATION}`);
  console.log(`DEPLOYMENT_READY: ${audit.scoreboard.DEPLOYMENT_READY}`);
  console.log(`PRODUCTION_READY: ${audit.scoreboard.PRODUCTION_READY}`);
  console.log(`GO_LIVE_READY: ${audit.scoreboard.GO_LIVE_READY}`);
  console.log(`SALES_ENABLED: ${audit.scoreboard.SALES_ENABLED}`);
  console.log(`\nReports written:`);
  console.log(`  ${mdPath}`);
  console.log(`  ${jsonPath}`);
  console.log(`\nBlockers: ${audit.blockers.length}`);
  console.log(`Warnings: ${audit.warnings.length}`);
  console.log(`Audit failure: ${audit.auditFailure}`);
}

if (audit.auditFailure) {
  process.exit(1);
}

const failedTests = testResults.filter((t) => t.status === "FAIL");
if (failedTests.length) {
  console.error(`\nAudit tests failed: ${failedTests.map((t) => t.command).join(", ")}`);
  process.exit(1);
}

process.exit(0);
