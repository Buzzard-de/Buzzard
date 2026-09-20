#!/usr/bin/env node
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";

const require = createRequire(import.meta.url);
const mode = process.argv[2] ?? "status";

execSync("node scripts/build-master-final-completion-bridge.mjs", { stdio: "pipe" });
const mod = require("../server/lib/masterFinalCompletion.bundle.cjs");

if (mode === "handoff") {
  const md = mod.buildFinalGoLiveHandoffMarkdown();
  const out = path.join(process.cwd(), "docs/BUZZARD_FINAL_GO_LIVE_HANDOFF.md");
  writeFileSync(out, md, "utf8");
  console.log(`Wrote ${out}`);
  process.exit(0);
}

const report = mod.buildMasterFinalCompletionReport();
if (mode === "json") {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (mode === "gate") {
  const failed = report.phases.some((p) => p.status === "BLOCKED" && p.phase !== "C" && p.phase !== "F");
  console.log(mod.formatMasterFinalCompletionBanner(report));
  if (report.SALES_ENABLED !== "0") {
    console.error("GATE_FAIL:SALES_ENABLED");
    process.exit(1);
  }
  if (report.scoreboard.PRODUCTION === "VALIDATED" || report.scoreboard.GO_LIVE === "VALIDATED") {
    console.error("GATE_FAIL:FAKE_GO_LIVE");
    process.exit(1);
  }
  if (failed) {
    console.error("GATE_FAIL:PHASE_BLOCKED");
    process.exit(1);
  }
  process.exit(0);
}

console.log(mod.formatMasterFinalCompletionBanner(report));
for (const p of report.phases) {
  console.log(`PHASE ${p.phase} — ${p.label}: ${p.status} (${p.tests})`);
}
