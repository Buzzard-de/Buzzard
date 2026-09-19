#!/usr/bin/env node
/**
 * Generate Render Persistent Disk Blueprint report (read-only, no deploy).
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

process.env.SALES_ENABLED = "0";

execSync("node scripts/build-production-storage-preflight-bridge.mjs", { stdio: "pipe", cwd: root });

const mod = require("../server/lib/productionStoragePreflight.bundle.cjs");
const report = await mod.buildRenderPersistentDiskBlueprintReport();

const mdPath = path.join(root, "docs/BUZZARD_RENDER_PERSISTENT_DISK_BLUEPRINT.md");
const jsonPath = path.join(root, "docs/BUZZARD_RENDER_PERSISTENT_DISK_BLUEPRINT.json");

function md(r) {
  return `# BUZZARD — Render Persistent Disk Blueprint

**Generated:** ${r.generatedAt}

## Scoreboard

| Check | Status |
|-------|--------|
| SOFTWARE_SUPPORT | ${r.SOFTWARE_SUPPORT} |
| BLUEPRINT_CONFIGURATION | ${r.BLUEPRINT_CONFIGURATION} |
| DATABASE_CONFIGURATION | ${r.DATABASE_CONFIGURATION} |
| BACKUP_CONFIGURATION | ${r.BACKUP_CONFIGURATION} |
| LIVE_RENDER_DISK | ${r.LIVE_RENDER_DISK} |
| LIVE_PERSISTENCE | ${r.LIVE_PERSISTENCE} |
| MANUAL_RENDER_ACTION | ${r.MANUAL_RENDER_ACTION} |
| PRODUCTION_READY | ${r.PRODUCTION_READY} |
| SALES_ENABLED | ${r.SALES_ENABLED} |

## Blueprint Fields

| Field | Value |
|-------|-------|
| RENDER_BLUEPRINT_DISK_CONFIGURED | ${r.blueprint.RENDER_BLUEPRINT_DISK_CONFIGURED} |
| RENDER_DISK_MOUNT_PATH | ${r.blueprint.RENDER_DISK_MOUNT_PATH} |
| RENDER_DB_PATH | ${r.blueprint.RENDER_DB_PATH} |
| RENDER_BACKUP_PATH | ${r.blueprint.RENDER_BACKUP_PATH} |
| RENDER_PERSISTENCE_READY | ${r.blueprint.RENDER_PERSISTENCE_READY} |

## Sections

### BLUEPRINT
${r.sections.blueprint.summary} — **${r.sections.blueprint.status}**

### DATABASE
Path \`${r.sections.database.path}\` — **${r.sections.database.status}**

### BACKUP
Path \`${r.sections.backup.path}\` — **${r.sections.backup.status}**

### LIVE
${r.sections.live.summary} — **${r.sections.live.status}**

### MANUAL ACTION
Required: **${r.sections.manualAction.required}**

${r.sections.manualAction.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## render.yaml status: **${r.renderYamlStatus}**

## Health endpoint
\`/api/health/db\` supported in code: ${r.blueprint.healthEndpointDbSupported}

## Migration
\`dbStartup.js\` ephemeral→persistent migration: ${r.blueprint.dbStartupMigrationPresent}

## Live health probe
${JSON.stringify(r.blueprint.liveHealthProbe, null, 2)}
`;
}

fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, md(report));

console.log("Blueprint reports written:");
console.log(`  ${mdPath}`);
console.log(`  ${jsonPath}`);
