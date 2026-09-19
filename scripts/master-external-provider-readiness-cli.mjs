#!/usr/bin/env node
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const json = process.argv.includes("--json");

process.env.SALES_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

execSync("node scripts/build-master-external-provider-readiness-bridge.mjs", { stdio: "pipe", cwd: root });
execSync("node scripts/build-external-access-control-center-bridge.mjs", { stdio: "pipe", cwd: root });

const mod = require("../server/lib/masterExternalProviderReadiness.bundle.cjs");
const report = mod.buildMasterExternalProviderReadinessReport();

function writeHandoff() {
  const doc = `# BUZZARD Final External Access Handoff

Generated: ${report.generatedAt}

## Execution order (mandatory)
363 Payment/Carrier/Returns → 364 Marketplace → 365 AI/Marketing → 366 Consolidation

Phase snapshots:
${report.phases.map((p) => `- #${p.phase}: ${JSON.stringify(p.summary)}`).join("\n")}

## Cursor completed (repository-safe)
- Master provider matrix (${report.masterMatrix.length} rows)
- Payment / carrier / returns / marketplace / AI / marketing readiness views
- Evidence registration schema (EXTERNAL_LIVE only)
- Blocker engine (${report.blockers.length} blockers)
- Human action list (${report.nextHumanActions.length} items)
- Go-live dependency graph extensions
- Integration with External Access Control Center #360–#362

## Operator must do (external accounts)
1. Render: persistent disk /var/data + health evidence (#361)
2. Inter Cars: production credentials + read-only validation + #342 gate (#362)
3. Payment: KYC, webhooks, production auth evidence (no charges in prep)
4. Carrier: account credentials (DHL/DPD/GLS/UPS/DHL Express) — no labels
5. Returns/refunds: provider credentials — no automatic refunds
6. Marketplaces: per-channel credentials — no live listings
7. AI: provider SecretRef — no production network
8. Marketing: accounts only — spend remains OFF
9. Human / four-eyes approvals for go-live chain
10. First order gate #344+ only after all above

## Missing by design in CI
- Production credentials
- Live validation evidence
- SALES remains 0

Next action: ${report.nextHumanActions[0]?.action ?? "—"}
`;
  fs.writeFileSync(path.join(root, "docs/BUZZARD_FINAL_EXTERNAL_ACCESS_HANDOFF.md"), doc);
}

if (json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(mod.formatMasterExternalReadinessBanner(report));
writeHandoff();
console.log("\nUpdated docs/BUZZARD_FINAL_EXTERNAL_ACCESS_HANDOFF.md");
