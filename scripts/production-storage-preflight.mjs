#!/usr/bin/env node
/**
 * Buzzard Render Persistence & Production Storage Preflight
 * Read-only validation — no deploy, no production data changes.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const jsonOutput = process.argv.includes("--json");

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

import { execSync } from "node:child_process";
execSync("node scripts/build-production-storage-preflight-bridge.mjs", { stdio: "pipe", cwd: root });

const mod = require("../server/lib/productionStoragePreflight.bundle.cjs");
const report = mod.buildProductionStoragePreflightReport();

const mdPath = path.join(root, "docs/BUZZARD_PRODUCTION_STORAGE_PREFLIGHT.md");
const jsonPath = path.join(root, "docs/BUZZARD_PRODUCTION_STORAGE_PREFLIGHT.json");

function renderMarkdown(r) {
  const h = r.healthStatus;
  return `# BUZZARD — Production Storage Preflight (Render)

**Generated:** ${r.generatedAt}
**Command:** \`npm run preflight:production-storage\`

---

## Scoreboard

| Check | Status |
|-------|--------|
| SOFTWARE_PERSISTENCE_SUPPORT | **${r.softwarePersistenceSupport}** |
| PERSISTENCE_CONFIGURATION | **${r.persistenceConfiguration}** |
| RENDER_PERSISTENT_DISK | **${r.renderPersistentDisk}** |
| LIVE_PERSISTENCE_VALIDATION | **${r.livePersistenceValidation}** |
| PRODUCTION_READY_IMPACT | **${r.productionReadyImpact}** |
| SALES_ENABLED | **${r.salesEnabled}** |
| PERSISTENCE_MODE | **${r.persistenceMode}** |

---

## Health Status

| Field | Value |
|-------|-------|
| PERSISTENCE_CONFIGURED | ${h.PERSISTENCE_CONFIGURED} |
| PERSISTENCE_PATH | \`${h.PERSISTENCE_PATH}\` |
| PERSISTENCE_WRITABLE | ${h.PERSISTENCE_WRITABLE} |
| SQLITE_READY | ${h.SQLITE_READY} |
| MIGRATION_READY | ${h.MIGRATION_READY} |
| BACKUP_READY | ${h.BACKUP_READY} |
| RESTORE_EVIDENCE | ${h.RESTORE_EVIDENCE} |
| RESTART_PERSISTENCE | ${h.RESTART_PERSISTENCE} |
| RENDER_MANUAL_ACTION_REQUIRED | ${h.RENDER_MANUAL_ACTION_REQUIRED} |

---

## PASS

${r.pass.map((p) => `- ${p}`).join("\n")}

---

## BLOCKED

${r.blocked.length ? r.blocked.map((b) => `- ${b}`).join("\n") : "- (none on this instance)"}

---

## UNVERIFIED

${r.unverified.map((u) => `- ${u}`).join("\n")}

---

## Manual Render Actions

${r.manualActions.map((a) => `${a.step}. **${a.action}** — ${a.reason}`).join("\n")}

---

## Environment (existence only — no secret values)

| Variable | Configured | Hint |
|----------|------------|------|
${r.environment.map((e) => `| ${e.name} | ${e.configured} | ${e.valueHint} |`).join("\n")}

---

## /var/data Validation

- Path: \`${r.varData.path}\`
- Exists: ${r.varData.exists}
- Directory: ${r.varData.isDirectory}
- Writable: ${r.varData.writable}
- SQLite openable: ${r.varData.sqliteOpenable}
- Status: **${r.varData.status}**
- Notes: ${r.varData.notes}

---

## SQLite Configuration

- Database path: \`${r.sqlite.databasePath}\`
- File exists: ${r.sqlite.fileExists}
- Journal mode: ${r.sqlite.journalMode ?? "—"}
- Foreign keys: ${r.sqlite.foreignKeys ?? "—"}
- Integrity: ${r.sqlite.integrityCheck ?? "—"}
- Migration ready: ${r.sqlite.migrationReady}
- Status: **${r.sqlite.status}**

---

## Restart Persistence Test (isolated temp DB)

- Status: **${r.restartPersistence.status}**
- Write OK: ${r.restartPersistence.writeOk}
- Read OK: ${r.restartPersistence.readOk}
- Cleanup OK: ${r.restartPersistence.cleanupOk}
- Notes: ${r.restartPersistence.notes}

---

## Backup / Restore

- Backup script: ${r.backupRestore.backupScriptPresent}
- Restore script: ${r.backupRestore.restoreScriptPresent}
- Backup dir: \`${r.backupRestore.backupDir}\`
- Backup available: ${r.backupRestore.backupAvailable}
- Restore evidence: **${r.backupRestore.restoreEvidence}**
- Status: **${r.backupRestore.status}**

---

## Deployment Configuration

- render.yaml: ${r.deployment.renderYamlPresent}
- Persistent disk in Blueprint: ${r.deployment.persistentDiskInBlueprint}
- BUZZARD_DB_PATH in Blueprint: ${r.deployment.buzzardDbPathInBlueprint}
- BUZZARD_BACKUP_DIR in Blueprint: ${r.deployment.backupDirInBlueprint}
- Health check: ${r.deployment.healthCheckConfigured}

---

## Side Effect Counters

\`\`\`json
${JSON.stringify(r.sideEffectCounters, null, 2)}
\`\`\`

---

## Production Flags (must remain OFF)

\`\`\`json
${JSON.stringify(r.productionFlags, null, 2)}
\`\`\`
`;
}

fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, renderMarkdown(report));

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("========================================");
  console.log("BUZZARD PRODUCTION STORAGE PREFLIGHT");
  console.log(`Generated: ${report.generatedAt}`);
  console.log("========================================\n");
  console.log(`SOFTWARE_PERSISTENCE_SUPPORT: ${report.softwarePersistenceSupport}`);
  console.log(`PERSISTENCE_CONFIGURATION: ${report.persistenceConfiguration}`);
  console.log(`RENDER_PERSISTENT_DISK: ${report.renderPersistentDisk}`);
  console.log(`LIVE_PERSISTENCE_VALIDATION: ${report.livePersistenceValidation}`);
  console.log(`PERSISTENCE_MODE: ${report.persistenceMode}`);
  console.log(`SALES_ENABLED: ${report.salesEnabled}`);
  console.log(`\nPERSISTENCE_PATH: ${report.healthStatus.PERSISTENCE_PATH}`);
  console.log(`/var/data exists: ${report.varData.exists}`);
  console.log(`SQLITE_READY: ${report.healthStatus.SQLITE_READY}`);
  console.log(`RESTORE_EVIDENCE: ${report.healthStatus.RESTORE_EVIDENCE}`);
  console.log(`RESTART_PERSISTENCE: ${report.healthStatus.RESTART_PERSISTENCE}`);
  console.log("\nBLOCKED:");
  for (const b of report.blocked) console.log(`  - ${b}`);
  console.log("\nMANUAL ACTIONS:");
  for (const a of report.manualActions.slice(0, 4)) console.log(`  ${a.step}. ${a.action}`);
  console.log(`\nReports: ${mdPath}`);
  console.log(`         ${jsonPath}`);
  console.log("========================================");
}

const sideFx = Object.values(report.sideEffectCounters).reduce((a, b) => a + (Number(b) || 0), 0);
if (sideFx > 0) {
  console.error("AUDIT FAILURE: side effects detected");
  process.exit(1);
}

if (report.productionFlags.SALES_ENABLED === "1") {
  console.error("AUDIT FAILURE: SALES_ENABLED unexpectedly ON");
  process.exit(1);
}

process.exit(0);
