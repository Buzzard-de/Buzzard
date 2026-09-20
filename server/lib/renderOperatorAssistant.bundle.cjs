const __import_meta_url__=require("url").pathToFileURL(__filename).href;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/render-operator-assistant/serverEntry.ts
var serverEntry_exports = {};
__export(serverEntry_exports, {
  buildRenderOperatorChecklist: () => buildRenderOperatorChecklist,
  buildRenderPersistentDiskOperatorGuideMarkdown: () => buildRenderPersistentDiskOperatorGuideMarkdown,
  evaluateLivePersistenceFromHealthBody: () => evaluateLivePersistenceFromHealthBody,
  parseBuzzardApiFromRenderYaml: () => parseBuzzardApiFromRenderYaml,
  resolveBuzzardApiBaseUrl: () => resolveBuzzardApiBaseUrl
});
module.exports = __toCommonJS(serverEntry_exports);

// lib/production-storage-preflight/renderBlueprintValidation.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var TARGET_MOUNT = "/var/data";
var TARGET_DB = "/var/data/buzzard.db";
var TARGET_BACKUP = "/var/data/backups";
function extractBuzzardApiBlock(yaml) {
  const start = yaml.indexOf("name: buzzard-api");
  if (start < 0) return null;
  const after = yaml.slice(start);
  const nextService = after.search(/\n  - type: web\n    name: buzzard-(?!api)/);
  if (nextService > 0) return after.slice(0, nextService);
  return after;
}
function countDiskBlocksInBuzzardApi(block) {
  return (block.match(/\bdisk:/g) || []).length;
}
function manualRenderActionForBlueprint(blueprintConfiguration, liveRenderDisk) {
  if (blueprintConfiguration === "PASS" && liveRenderDisk !== "PASS") return "BLOCKED";
  if (liveRenderDisk === "PASS") return "UNVERIFIED";
  return "BLOCKED";
}
function validateRenderBlueprint() {
  const renderYamlPath = import_path.default.join(process.cwd(), "render.yaml");
  const dbStartupPath = import_path.default.join(process.cwd(), "server/lib/dbStartup.js");
  const healthPluginPath = import_path.default.join(process.cwd(), "server/plugins/controlCenterPlugin.js");
  const renderYamlPresent = import_fs.default.existsSync(renderYamlPath);
  const yaml = renderYamlPresent ? import_fs.default.readFileSync(renderYamlPath, "utf8") : "";
  const apiBlock = yaml ? extractBuzzardApiBlock(yaml) : null;
  const buzzardApiServiceFound = Boolean(apiBlock);
  let diskMountPath = null;
  let diskSizeGB = null;
  let diskName = null;
  let duplicateBuzzardApiDisks = 0;
  if (apiBlock) {
    duplicateBuzzardApiDisks = countDiskBlocksInBuzzardApi(apiBlock);
    const mountMatch = apiBlock.match(/mountPath:\s*(\S+)/);
    diskMountPath = mountMatch?.[1] ?? null;
    const sizeMatch = apiBlock.match(/sizeGB:\s*(\d+)/);
    diskSizeGB = sizeMatch ? Number(sizeMatch[1]) : null;
    const nameMatch = apiBlock.match(/disk:[\s\S]*?name:\s*(\S+)/);
    diskName = nameMatch?.[1] ?? null;
  }
  const diskConfigured = buzzardApiServiceFound && diskMountPath === TARGET_MOUNT && diskSizeGB === 1 && duplicateBuzzardApiDisks === 1;
  const dbPathInBlueprint = buzzardApiServiceFound && apiBlock.includes("BUZZARD_DB_PATH") && apiBlock.includes(TARGET_DB);
  const backupInBlueprint = buzzardApiServiceFound && apiBlock.includes("BUZZARD_BACKUP_DIR") && apiBlock.includes(TARGET_BACKUP);
  const healthEndpointDbSupported = import_fs.default.existsSync(healthPluginPath) && import_fs.default.readFileSync(healthPluginPath, "utf8").includes("/api/health/db");
  const dbStartupMigrationPresent = import_fs.default.existsSync(dbStartupPath) && import_fs.default.readFileSync(dbStartupPath, "utf8").includes("migrateEphemeralToPersistentIfNeeded");
  let renderYamlStatus = "BLOCKED";
  if (renderYamlPresent && buzzardApiServiceFound && diskConfigured && dbPathInBlueprint && backupInBlueprint) {
    renderYamlStatus = "PASS";
  } else if (renderYamlPresent && buzzardApiServiceFound) {
    renderYamlStatus = "WARNING";
  }
  const blueprintConfiguration = diskConfigured && dbPathInBlueprint && backupInBlueprint ? "PASS" : "BLOCKED";
  let LIVE_RENDER_DISK = "UNVERIFIED";
  const LIVE_PERSISTENCE = "UNVERIFIED";
  const RENDER_PERSISTENCE_READY = "UNVERIFIED";
  const MANUAL_RENDER_ACTION = manualRenderActionForBlueprint(blueprintConfiguration, LIVE_RENDER_DISK);
  return {
    RENDER_BLUEPRINT_DISK_CONFIGURED: diskConfigured ? "PASS" : buzzardApiServiceFound ? "WARNING" : "BLOCKED",
    RENDER_DISK_MOUNT_PATH: diskMountPath ?? TARGET_MOUNT,
    RENDER_DB_PATH: TARGET_DB,
    RENDER_BACKUP_PATH: TARGET_BACKUP,
    RENDER_PERSISTENCE_READY,
    BLUEPRINT_CONFIGURATION: blueprintConfiguration,
    DATABASE_CONFIGURATION: dbPathInBlueprint ? "PASS" : "BLOCKED",
    BACKUP_CONFIGURATION: backupInBlueprint ? "PASS" : "BLOCKED",
    LIVE_RENDER_DISK,
    LIVE_PERSISTENCE,
    MANUAL_RENDER_ACTION,
    SOFTWARE_SUPPORT: healthEndpointDbSupported && dbStartupMigrationPresent && import_fs.default.existsSync(import_path.default.join(process.cwd(), "server/lib/dbPaths.js")) ? "PASS" : "WARNING",
    buzzardApiServiceFound,
    diskName,
    diskSizeGB,
    diskMountPath,
    duplicateBuzzardApiDisks,
    healthEndpointDbSupported,
    dbStartupMigrationPresent,
    renderYamlStatus
  };
}

// lib/render-persistence-evidence-bridge/evidenceValidation.ts
var TARGET_DB2 = "/var/data/buzzard.db";
var TARGET_BACKUP2 = "/var/data/backups";
var TARGET_MOUNT2 = "/var/data";
var RENDER_PERSISTENCE_TARGETS = {
  mount: TARGET_MOUNT2,
  db: TARGET_DB2,
  backup: TARGET_BACKUP2
};

// lib/render-persistence-evidence-bridge/evidenceStore.ts
var store = /* @__PURE__ */ new Map();
function isExpired(e, now = Date.now()) {
  if (!e.expiresAt) return false;
  const t = Date.parse(e.expiresAt);
  return Number.isFinite(t) && t < now;
}
function listRenderPersistenceEvidence(includeExpired = false) {
  const all = [...store.values()];
  if (includeExpired) return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return all.filter((e) => !isExpired(e)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// lib/render-persistence-evidence-bridge/persistenceStatus.ts
function mapBlueprint(blueprintPass) {
  return blueprintPass ? "VALIDATED" : "BLOCKED";
}
function liveFromEvidence(kind, predicate) {
  const active = listRenderPersistenceEvidence(false).filter((e) => e.kind === kind && e.source === "RENDER_LIVE");
  if (active.some(predicate)) return "VALIDATED";
  return "UNVERIFIED_EXTERNAL";
}
function buildRenderPersistenceLiveStatus() {
  const blueprint = validateRenderBlueprint();
  const blueprintOk = blueprint.BLUEPRINT_CONFIGURATION === "PASS";
  const healthEvidence = listRenderPersistenceEvidence(false).filter(
    (e) => e.kind === "RENDER_PERSISTENCE_HEALTH" && e.source === "RENDER_LIVE"
  );
  const healthValid = healthEvidence.some((e) => e.persistent === true && e.dbPath?.includes("/var/data/buzzard.db"));
  const LIVE_RENDER_DISK = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_DB_PATH = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_DB_HEALTH = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_RESTART_PERSISTENCE = liveFromEvidence(
    "RENDER_RESTART_PERSISTENCE",
    (e) => e.restart?.samePersistentPath === true && e.restart.databaseIntegrity === "ok"
  );
  const LIVE_BACKUP = liveFromEvidence(
    "RENDER_BACKUP",
    (e) => e.backup?.success === true && Boolean(e.backup.backupPath?.includes("/var/data/backups"))
  );
  const LIVE_RESTORE = liveFromEvidence("RENDER_RESTORE", (e) => e.restore?.success === true);
  let PERSISTENCE = "HUMAN_REQUIRED";
  if (!blueprintOk) {
    PERSISTENCE = "BLOCKED";
  } else if (LIVE_RENDER_DISK === "VALIDATED" && LIVE_DB_PATH === "VALIDATED" && LIVE_DB_HEALTH === "VALIDATED" && LIVE_RESTART_PERSISTENCE === "VALIDATED" && LIVE_BACKUP === "VALIDATED") {
    PERSISTENCE = "VALIDATED";
  } else if (blueprintOk) {
    PERSISTENCE = "HUMAN_REQUIRED";
  }
  return {
    BLUEPRINT_CONFIGURATION: mapBlueprint(blueprintOk),
    LIVE_RENDER_DISK,
    LIVE_DB_PATH,
    LIVE_DB_HEALTH,
    LIVE_RESTART_PERSISTENCE,
    LIVE_BACKUP,
    LIVE_RESTORE,
    PERSISTENCE
  };
}

// lib/render-operator-assistant/parseRenderService.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
function extractBuzzardApiBlock2(yaml) {
  const start = yaml.indexOf("name: buzzard-api");
  if (start < 0) return null;
  const after = yaml.slice(start);
  const nextService = after.search(/\n  - type: web\n    name: buzzard-(?!api)/);
  if (nextService > 0) return after.slice(0, nextService);
  return after;
}
function readEnvValue(block, key) {
  const re = new RegExp(`- key: ${key}[\\s\\S]*?value:\\s*(.+)`);
  const m = block.match(re);
  return m?.[1]?.trim() ?? null;
}
function parseBuzzardApiFromRenderYaml(cwd = process.cwd()) {
  const renderYamlPath = import_path2.default.join(cwd, "render.yaml");
  const renderYamlPresent = import_fs2.default.existsSync(renderYamlPath);
  const yaml = renderYamlPresent ? import_fs2.default.readFileSync(renderYamlPath, "utf8") : "";
  const block = yaml ? extractBuzzardApiBlock2(yaml) : null;
  const serviceName = block ? "buzzard-api" : "UNKNOWN";
  let mountPath = null;
  let diskSizeGB = null;
  let diskName = null;
  if (block) {
    mountPath = block.match(/mountPath:\s*(\S+)/)?.[1] ?? null;
    diskSizeGB = block.match(/sizeGB:\s*(\d+)/) ? Number(block.match(/sizeGB:\s*(\d+)/)[1]) : null;
    diskName = block.match(/disk:[\s\S]*?name:\s*(\S+)/)?.[1] ?? null;
  }
  const dbPathEnv = block ? readEnvValue(block, "BUZZARD_DB_PATH") : null;
  const backupDirEnv = block ? readEnvValue(block, "BUZZARD_BACKUP_DIR") : null;
  const healthCheckPath = block?.match(/healthCheckPath:\s*(\S+)/)?.[1] ?? "/api/health";
  const defaultApiBaseUrl = serviceName === "buzzard-api" ? `https://${serviceName}.onrender.com` : null;
  const healthDbUrl = defaultApiBaseUrl ? `${defaultApiBaseUrl}/api/health/db` : null;
  return {
    serviceName,
    mountPath,
    diskSizeGB,
    diskName,
    dbPathEnv,
    backupDirEnv,
    healthCheckPath,
    defaultApiBaseUrl,
    healthDbUrl,
    renderYamlPresent
  };
}
function resolveBuzzardApiBaseUrl(cwd = process.cwd()) {
  if (process.env.BUZZARD_API_URL?.trim()) {
    return process.env.BUZZARD_API_URL.replace(/\/$/, "");
  }
  const parsed = parseBuzzardApiFromRenderYaml(cwd);
  if (parsed.defaultApiBaseUrl) return parsed.defaultApiBaseUrl;
  throw new Error("BUZZARD_API_URL not set and buzzard-api not found in render.yaml");
}

// lib/render-operator-assistant/operatorChecklist.ts
function buildRenderOperatorChecklist() {
  const blueprint = validateRenderBlueprint();
  const live = buildRenderPersistenceLiveStatus();
  const parsed = parseBuzzardApiFromRenderYaml();
  const serviceFound = parsed.serviceName === "buzzard-api" && parsed.renderYamlPresent;
  const blueprintDisk = blueprint.RENDER_BLUEPRINT_DISK_CONFIGURED === "PASS";
  return [
    {
      id: "service",
      label: "Render service found (buzzard-api in render.yaml)",
      checked: serviceFound,
      currentStatus: serviceFound ? "CONFIGURED" : "BLOCKED",
      evidence: "render.yaml",
      blocker: serviceFound ? "\u2014" : "Missing buzzard-api service block"
    },
    {
      id: "disk_created",
      label: "Persistent Disk created in Render Dashboard",
      checked: live.LIVE_RENDER_DISK === "VALIDATED",
      currentStatus: live.LIVE_RENDER_DISK,
      evidence: live.LIVE_RENDER_DISK === "VALIDATED" ? "RENDER_LIVE health evidence" : "none",
      blocker: live.LIVE_RENDER_DISK === "VALIDATED" ? "\u2014" : "RENDER DASHBOARD ACTION REQUIRED"
    },
    {
      id: "disk_size",
      label: "Disk size >= 1 GB",
      checked: blueprintDisk && (parsed.diskSizeGB ?? 0) >= 1,
      currentStatus: blueprintDisk ? `blueprint:${parsed.diskSizeGB}GB` : "UNVERIFIED_EXTERNAL",
      evidence: "render.yaml disk.sizeGB",
      blocker: blueprintDisk ? "\u2014" : "Fix render.yaml or create disk in Dashboard"
    },
    {
      id: "mount_path",
      label: "Mount path = /var/data",
      checked: parsed.mountPath === "/var/data" && live.LIVE_RENDER_DISK === "VALIDATED",
      currentStatus: live.LIVE_RENDER_DISK,
      evidence: parsed.mountPath ?? "missing",
      blocker: live.LIVE_RENDER_DISK === "VALIDATED" ? "\u2014" : "Operator mount + live health"
    },
    {
      id: "db_path_env",
      label: "BUZZARD_DB_PATH=/var/data/buzzard.db",
      checked: parsed.dbPathEnv === "/var/data/buzzard.db",
      currentStatus: parsed.dbPathEnv ?? "NOT_SET",
      evidence: "render.yaml env",
      blocker: parsed.dbPathEnv === "/var/data/buzzard.db" ? "\u2014" : "Set env in Render Dashboard"
    },
    {
      id: "backup_dir_env",
      label: "BUZZARD_BACKUP_DIR=/var/data/backups",
      checked: parsed.backupDirEnv === "/var/data/backups",
      currentStatus: parsed.backupDirEnv ?? "NOT_SET",
      evidence: "render.yaml env",
      blocker: parsed.backupDirEnv === "/var/data/backups" ? "\u2014" : "Set env in Render Dashboard"
    },
    {
      id: "deploy",
      label: "Deploy / redeploy performed by operator",
      checked: live.LIVE_DB_HEALTH === "VALIDATED",
      currentStatus: live.LIVE_DB_HEALTH,
      evidence: "GET /api/health/db",
      blocker: "RENDER DASHBOARD ACTION REQUIRED \u2014 Cursor cannot deploy"
    },
    {
      id: "health_db",
      label: "/api/health/db checked",
      checked: live.LIVE_DB_HEALTH === "VALIDATED",
      currentStatus: live.LIVE_DB_HEALTH,
      evidence: "verify-render-persistence / RENDER_LIVE evidence",
      blocker: live.LIVE_DB_HEALTH === "VALIDATED" ? "\u2014" : "Run npm run verify:render-persistence after deploy"
    },
    {
      id: "persistent_true",
      label: "persistent=true",
      checked: live.LIVE_RENDER_DISK === "VALIDATED",
      currentStatus: live.LIVE_RENDER_DISK,
      evidence: "health/db JSON",
      blocker: "Live endpoint must report persistent=true"
    },
    {
      id: "path_var_data",
      label: "path=/var/data/buzzard.db",
      checked: live.LIVE_DB_PATH === "VALIDATED",
      currentStatus: live.LIVE_DB_PATH,
      evidence: "health/db JSON",
      blocker: "Ephemeral path until disk mounted"
    },
    {
      id: "restart",
      label: "Manual Render restart performed",
      checked: live.LIVE_RESTART_PERSISTENCE === "VALIDATED",
      currentStatus: live.LIVE_RESTART_PERSISTENCE,
      evidence: "RENDER_RESTART_PERSISTENCE evidence",
      blocker: "Operator restart + re-verify + register evidence"
    },
    {
      id: "restart_pass",
      label: "After restart: DB persistence still PASS",
      checked: live.LIVE_RESTART_PERSISTENCE === "VALIDATED",
      currentStatus: live.LIVE_RESTART_PERSISTENCE,
      evidence: "restart persistence evidence",
      blocker: "\u2014"
    },
    {
      id: "backup",
      label: "Backup created (npm run backup:db on production shell)",
      checked: live.LIVE_BACKUP === "VALIDATED",
      currentStatus: live.LIVE_BACKUP,
      evidence: "RENDER_BACKUP evidence",
      blocker: "Operator runs backup on Render \u2014 Cursor will not fake"
    },
    {
      id: "backup_evidence",
      label: "Backup evidence registered",
      checked: live.LIVE_BACKUP === "VALIDATED",
      currentStatus: live.LIVE_BACKUP,
      evidence: "render-persistence evidence bridge",
      blocker: "Use evidence CLI after real backup"
    },
    {
      id: "restore",
      label: "Restore validation (dry-run / controlled only)",
      checked: live.LIVE_RESTORE === "VALIDATED",
      currentStatus: live.LIVE_RESTORE,
      evidence: "RENDER_RESTORE evidence",
      blocker: "Production restore requires BUZZARD_ALLOW_PRODUCTION_RESTORE=1"
    },
    {
      id: "gate",
      label: "Render persistence gate PASS",
      checked: live.PERSISTENCE === "VALIDATED",
      currentStatus: live.PERSISTENCE,
      evidence: "gate:render-persistence",
      blocker: live.PERSISTENCE === "VALIDATED" ? "\u2014" : "Complete live evidence chain"
    }
  ];
}

// lib/render-operator-assistant/buildOperatorGuide.ts
function buildRenderPersistentDiskOperatorGuideMarkdown() {
  const parsed = parseBuzzardApiFromRenderYaml();
  const blueprint = validateRenderBlueprint();
  const live = buildRenderPersistenceLiveStatus();
  const checklist = buildRenderOperatorChecklist();
  const apiUrl = process.env.BUZZARD_API_URL?.replace(/\/$/, "") || parsed.defaultApiBaseUrl || "(set BUZZARD_API_URL)";
  const healthUrl = `${apiUrl}/api/health/db`;
  const lines = [
    "# BUZZARD \u2014 Render Persistent Disk Operator Guide",
    "",
    `Generated: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    "",
    "## RENDER DASHBOARD ACTION REQUIRED",
    "",
    "**Cursor does not have access to your Render Dashboard.** Nothing below is marked done until you perform the steps and run verification.",
    "",
    "GOLDEN RULE: **RENDER BLUEPRINT \u2260 LIVE RENDER** \u2014 `render.yaml` disk config does not prove the disk is mounted at runtime.",
    "",
    "---",
    "",
    "## Repository facts (from `render.yaml`)",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Service name | \`${parsed.serviceName}\` |`,
    `| Disk name | \`${parsed.diskName ?? "\u2014"}\` |`,
    `| Mount path (blueprint) | \`${parsed.mountPath ?? "\u2014"}\` |`,
    `| Disk size (blueprint) | \`${parsed.diskSizeGB ?? "\u2014"} GB\` |`,
    `| BUZZARD_DB_PATH (blueprint) | \`${parsed.dbPathEnv ?? "\u2014"}\` |`,
    `| BUZZARD_BACKUP_DIR (blueprint) | \`${parsed.backupDirEnv ?? "\u2014"}\` |`,
    `| Health check (service) | \`${parsed.healthCheckPath ?? "/api/health"}\` |`,
    `| DB health URL (derive) | \`${healthUrl}\` |`,
    "",
    `BLUEPRINT_CONFIGURATION: **${blueprint.BLUEPRINT_CONFIGURATION === "PASS" ? "CONFIGURED" : "BLOCKED"}**`,
    "",
    "---",
    "",
    "## Operator steps",
    "",
    "### STEP 1 \u2014 Render Dashboard login",
    "Open [Render Dashboard](https://dashboard.render.com/) and sign in.",
    "",
    "### STEP 2 \u2014 Find Buzzard API service",
    `Service name from repository: **\`${parsed.serviceName}\`** (do not use a different name unless your Dashboard differs).`,
    "",
    "### STEP 3 \u2014 Settings \u2192 Disks",
    `Open **Settings \u2192 Disks** for \`${parsed.serviceName}\`.`,
    "",
    "### STEP 4 \u2014 Create Persistent Disk",
    "- **Mount Path:** `/var/data`",
    "- **Disk Size:** at least **1 GB**",
    "",
    "### STEP 5 \u2014 Environment variables",
    "Confirm in Render Dashboard:",
    "- `BUZZARD_DB_PATH=/var/data/buzzard.db`",
    "- `BUZZARD_BACKUP_DIR=/var/data/backups`",
    "",
    "### STEP 6 \u2014 Save",
    "Save disk and environment changes.",
    "",
    "### STEP 7 \u2014 Deploy (operator only)",
    "Trigger **Deploy** / **Manual Deploy** from Render. **Cursor does not deploy.**",
    "",
    "### STEP 8 \u2014 Verify DB health",
    `After deploy succeeds, run from your workstation:`,
    "",
    "```bash",
    `BUZZARD_API_URL=${apiUrl} npm run verify:render-persistence`,
    "```",
    "",
    `Or curl: \`curl -sS ${healthUrl}\``,
    "",
    "Expected when live disk is active:",
    "- `persistent: true`",
    "- `path` contains `/var/data/buzzard.db`",
    "",
    "---",
    "",
    "## PHASE 5 \u2014 Restart persistence test (operator)",
    "",
    "1. Run `npm run verify:render-persistence` (baseline).",
    "2. In Render Dashboard: **Manual Restart** on `buzzard-api`.",
    "3. Wait until service is live.",
    "4. Run `npm run verify:render-persistence` again.",
    "5. Confirm `persistent=true` and path still `/var/data/buzzard.db`.",
    "6. Register restart evidence via render persistence evidence bridge (operator attestation).",
    "",
    "If restart breaks persistence: `LIVE_RESTART_PERSISTENCE=BLOCKED` or `UNVERIFIED_EXTERNAL`.",
    "",
    "---",
    "",
    "## PHASE 6 \u2014 Backup (operator on Render shell)",
    "",
    "Use existing script only: `npm run backup:db` with `BUZZARD_DB_PATH` and `BUZZARD_BACKUP_DIR` pointing at `/var/data`.",
    "Cursor **will not** claim backup PASS without `RENDER_BACKUP` evidence.",
    "",
    "---",
    "",
    "## PHASE 7 \u2014 Restore safety",
    "",
    "Use `scripts/restore-db.mjs` only with existing guards.",
    "Production restore requires `BUZZARD_ALLOW_PRODUCTION_RESTORE=1` \u2014 do not bypass.",
    "",
    "---",
    "",
    "## Current live status (evidence SSOT)",
    "",
    `| Check | Status |`,
    `|-------|--------|`,
    `| LIVE_RENDER_DISK | ${live.LIVE_RENDER_DISK} |`,
    `| LIVE_DB_PATH | ${live.LIVE_DB_PATH} |`,
    `| LIVE_DB_HEALTH | ${live.LIVE_DB_HEALTH} |`,
    `| LIVE_RESTART_PERSISTENCE | ${live.LIVE_RESTART_PERSISTENCE} |`,
    `| LIVE_BACKUP | ${live.LIVE_BACKUP} |`,
    `| LIVE_RESTORE | ${live.LIVE_RESTORE} |`,
    `| PERSISTENCE | ${live.PERSISTENCE} |`,
    "",
    "PRODUCTION / GO_LIVE remain **BLOCKED** until full external chain completes. **SALES_ENABLED=0**.",
    "",
    "---",
    "",
    "## Operator checklist",
    "",
    "| Done | Step | CURRENT STATUS | EVIDENCE | BLOCKER |",
    "|------|------|----------------|----------|---------|"
  ];
  for (const item of checklist) {
    lines.push(
      `| ${item.checked ? "x" : " "} | ${item.label} | ${item.currentStatus} | ${item.evidence} | ${item.blocker} |`
    );
  }
  lines.push("", "---", "", "## Commands", "", "```bash", "npm run status:render-persistence", "npm run preflight:render-persistence", "npm run verify:render-persistence", "npm run gate:render-persistence", "```", "");
  return lines.join("\n");
}

// lib/render-persistence-evidence-bridge/healthDbEvaluation.ts
function evaluateHealthDbResponse(body) {
  const reasons = [];
  const path3 = body.database?.path ?? null;
  const persistent = body.database?.persistence?.persistent ?? null;
  const backupPath = body.database?.persistence?.backupDir ?? null;
  const integrityHint = body.database?.error ? `error:${body.database.error}` : "unknown";
  if (persistent !== true) reasons.push("persistent_not_true");
  if (!path3?.includes(RENDER_PERSISTENCE_TARGETS.mount) || !path3.includes("buzzard.db")) {
    reasons.push("db_path_not_var_data");
  }
  if (backupPath && !backupPath.includes(RENDER_PERSISTENCE_TARGETS.backup)) {
    reasons.push("backup_path_not_var_data_backups");
  }
  const meetsLivePersistenceCriteria = persistent === true && Boolean(path3?.includes(RENDER_PERSISTENCE_TARGETS.mount) && path3.includes("buzzard.db"));
  return {
    persistent,
    path: path3,
    backupPath,
    integrityHint,
    meetsLivePersistenceCriteria,
    reasons
  };
}

// lib/render-operator-assistant/livePersistenceVerify.ts
function mapLive(status, healthCriteriaMet) {
  if (status === "VALIDATED") return "PASS";
  if (healthCriteriaMet && status === "UNVERIFIED_EXTERNAL") {
    return "UNVERIFIED_EXTERNAL";
  }
  return status === "BLOCKED" ? "BLOCKED" : "UNVERIFIED_EXTERNAL";
}
function evaluateLivePersistenceFromHealthBody(body, httpStatus, httpReachable) {
  const blueprint = validateRenderBlueprint();
  const bridgeLive = buildRenderPersistenceLiveStatus();
  const evaluation = body ? evaluateHealthDbResponse(body) : evaluateHealthDbResponse({});
  const healthCriteriaMet = httpReachable && httpStatus !== null && httpStatus >= 200 && httpStatus < 300 && evaluation.meetsLivePersistenceCriteria;
  const diskPass = healthCriteriaMet ? "PASS" : "UNVERIFIED_EXTERNAL";
  const dbPathPass = healthCriteriaMet ? "PASS" : "UNVERIFIED_EXTERNAL";
  const dbHealthPass = healthCriteriaMet ? "PASS" : httpReachable ? "FAIL" : "UNVERIFIED_EXTERNAL";
  return {
    httpReachable,
    httpStatus,
    environment: process.env.NODE_ENV === "production" ? "production" : "operator-workstation",
    evaluation,
    live: {
      BLUEPRINT_CONFIGURATION: blueprint.BLUEPRINT_CONFIGURATION === "PASS" ? "VALIDATED" : "BLOCKED",
      LIVE_RENDER_DISK: diskPass,
      LIVE_DB_PATH: dbPathPass,
      LIVE_DB_HEALTH: dbHealthPass,
      LIVE_RESTART_PERSISTENCE: mapLive(bridgeLive.LIVE_RESTART_PERSISTENCE, false),
      LIVE_BACKUP: mapLive(bridgeLive.LIVE_BACKUP, false),
      LIVE_RESTORE: mapLive(bridgeLive.LIVE_RESTORE, false),
      PERSISTENCE: bridgeLive.PERSISTENCE
    },
    blueprintNote: "RENDER BLUEPRINT \u2260 LIVE RENDER \u2014 YAML disk block does not prove runtime mount",
    cursorHasRenderDashboardAccess: false,
    dashboardActionRequired: !healthCriteriaMet
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildRenderOperatorChecklist,
  buildRenderPersistentDiskOperatorGuideMarkdown,
  evaluateLivePersistenceFromHealthBody,
  parseBuzzardApiFromRenderYaml,
  resolveBuzzardApiBaseUrl
});
