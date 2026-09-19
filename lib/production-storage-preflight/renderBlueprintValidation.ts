import fs from "fs";
import path from "path";
import type { PreflightStatus } from "./types";
import { validateVarDataMount } from "./varDataValidation";

export interface RenderBlueprintValidation {
  RENDER_BLUEPRINT_DISK_CONFIGURED: PreflightStatus;
  RENDER_DISK_MOUNT_PATH: string;
  RENDER_DB_PATH: string;
  RENDER_BACKUP_PATH: string;
  /** Never PASS from repository YAML alone — live mount required for PASS */
  RENDER_PERSISTENCE_READY: PreflightStatus;
  BLUEPRINT_CONFIGURATION: PreflightStatus;
  DATABASE_CONFIGURATION: PreflightStatus;
  BACKUP_CONFIGURATION: PreflightStatus;
  LIVE_RENDER_DISK: PreflightStatus;
  LIVE_PERSISTENCE: PreflightStatus;
  MANUAL_RENDER_ACTION: PreflightStatus;
  SOFTWARE_SUPPORT: PreflightStatus;
  buzzardApiServiceFound: boolean;
  diskName: string | null;
  diskSizeGB: number | null;
  diskMountPath: string | null;
  duplicateBuzzardApiDisks: number;
  healthEndpointDbSupported: boolean;
  dbStartupMigrationPresent: boolean;
  renderYamlStatus: PreflightStatus;
  liveHealthProbe: {
    attempted: boolean;
    reachable: boolean;
    persistent: boolean | null;
    path: string | null;
    notes: string;
  };
}

const TARGET_MOUNT = "/var/data";
const TARGET_DB = "/var/data/buzzard.db";
const TARGET_BACKUP = "/var/data/backups";

function extractBuzzardApiBlock(yaml: string): string | null {
  const start = yaml.indexOf("name: buzzard-api");
  if (start < 0) return null;
  const after = yaml.slice(start);
  const nextService = after.search(/\n  - type: web\n    name: buzzard-(?!api)/);
  if (nextService > 0) return after.slice(0, nextService);
  return after;
}

function countDiskBlocksInBuzzardApi(block: string): number {
  return (block.match(/\bdisk:/g) || []).length;
}

function manualRenderActionForBlueprint(blueprintConfiguration: PreflightStatus, liveRenderDisk: PreflightStatus): PreflightStatus {
  if (blueprintConfiguration === "PASS" && liveRenderDisk !== "PASS") return "BLOCKED";
  if (liveRenderDisk === "PASS") return "UNVERIFIED";
  return "BLOCKED";
}

/** Sync blueprint check — never infers live Render mount from YAML alone */
export type RenderBlueprintSync = Omit<RenderBlueprintValidation, "liveHealthProbe">;

export function validateRenderBlueprint(): RenderBlueprintSync {
  const renderYamlPath = path.join(process.cwd(), "render.yaml");
  const dbStartupPath = path.join(process.cwd(), "server/lib/dbStartup.js");
  const healthPluginPath = path.join(process.cwd(), "server/plugins/controlCenterPlugin.js");

  const renderYamlPresent = fs.existsSync(renderYamlPath);
  const yaml = renderYamlPresent ? fs.readFileSync(renderYamlPath, "utf8") : "";
  const apiBlock = yaml ? extractBuzzardApiBlock(yaml) : null;
  const buzzardApiServiceFound = Boolean(apiBlock);

  let diskMountPath: string | null = null;
  let diskSizeGB: number | null = null;
  let diskName: string | null = null;
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

  const diskConfigured =
    buzzardApiServiceFound &&
    diskMountPath === TARGET_MOUNT &&
    diskSizeGB === 1 &&
    duplicateBuzzardApiDisks === 1;

  const dbPathInBlueprint =
    buzzardApiServiceFound &&
    apiBlock!.includes("BUZZARD_DB_PATH") &&
    apiBlock!.includes(TARGET_DB);

  const backupInBlueprint =
    buzzardApiServiceFound &&
    apiBlock!.includes("BUZZARD_BACKUP_DIR") &&
    apiBlock!.includes(TARGET_BACKUP);

  const healthEndpointDbSupported =
    fs.existsSync(healthPluginPath) && fs.readFileSync(healthPluginPath, "utf8").includes("/api/health/db");

  const dbStartupMigrationPresent =
    fs.existsSync(dbStartupPath) &&
    fs.readFileSync(dbStartupPath, "utf8").includes("migrateEphemeralToPersistentIfNeeded");

  let renderYamlStatus: PreflightStatus = "BLOCKED";
  if (renderYamlPresent && buzzardApiServiceFound && diskConfigured && dbPathInBlueprint && backupInBlueprint) {
    renderYamlStatus = "PASS";
  } else if (renderYamlPresent && buzzardApiServiceFound) {
    renderYamlStatus = "WARNING";
  }

  const blueprintConfiguration: PreflightStatus = diskConfigured && dbPathInBlueprint && backupInBlueprint ? "PASS" : "BLOCKED";

  let LIVE_RENDER_DISK: PreflightStatus = "UNVERIFIED";
  const LIVE_PERSISTENCE: PreflightStatus = "UNVERIFIED";
  const RENDER_PERSISTENCE_READY: PreflightStatus = "UNVERIFIED";
  const MANUAL_RENDER_ACTION: PreflightStatus = manualRenderActionForBlueprint(blueprintConfiguration, LIVE_RENDER_DISK);

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
    SOFTWARE_SUPPORT:
      healthEndpointDbSupported && dbStartupMigrationPresent && fs.existsSync(path.join(process.cwd(), "server/lib/dbPaths.js"))
        ? "PASS"
        : "WARNING",
    buzzardApiServiceFound,
    diskName,
    diskSizeGB,
    diskMountPath,
    duplicateBuzzardApiDisks,
    healthEndpointDbSupported,
    dbStartupMigrationPresent,
    renderYamlStatus,
  };
}

export async function probeLiveRenderHealthDb(): Promise<RenderBlueprintValidation["liveHealthProbe"]> {
  const api = (process.env.BUZZARD_API_URL || "").replace(/\/$/, "");
  if (!api) {
    return {
      attempted: false,
      reachable: false,
      persistent: null,
      path: null,
      notes: "BUZZARD_API_URL not set — skip live probe",
    };
  }
  try {
    const res = await fetch(`${api}/api/health/db`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return {
        attempted: true,
        reachable: false,
        persistent: null,
        path: null,
        notes: `HTTP ${res.status}`,
      };
    }
    const body = (await res.json()) as { database?: { path?: string; persistence?: { persistent?: boolean } } };
    const dbPath = body.database?.path ?? null;
    const persistent = body.database?.persistence?.persistent ?? null;
    return {
      attempted: true,
      reachable: true,
      persistent,
      path: dbPath,
      notes:
        persistent === true && dbPath?.includes("/var/data")
          ? "Live health confirms persistent disk"
          : "Live instance not yet on persistent disk",
    };
  } catch (err) {
    return {
      attempted: true,
      reachable: false,
      persistent: null,
      path: null,
      notes: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}

export async function buildRenderBlueprintValidation(): Promise<RenderBlueprintValidation> {
  const base = validateRenderBlueprint();
  const varData = validateVarDataMount();
  const liveHealthProbe = await probeLiveRenderHealthDb();

  let LIVE_RENDER_DISK: PreflightStatus = "UNVERIFIED";
  let LIVE_PERSISTENCE: PreflightStatus = "UNVERIFIED";

  if (liveHealthProbe.reachable && liveHealthProbe.persistent === true && liveHealthProbe.path?.includes("/var/data")) {
    LIVE_RENDER_DISK = "PASS";
    LIVE_PERSISTENCE = "PASS";
  } else if (varData.exists && varData.writable && varData.sqliteOpenable) {
    LIVE_RENDER_DISK = "UNVERIFIED";
    LIVE_PERSISTENCE = "UNVERIFIED";
  }

  const RENDER_PERSISTENCE_READY: PreflightStatus =
    LIVE_RENDER_DISK === "PASS" && LIVE_PERSISTENCE === "PASS" ? "PASS" : "UNVERIFIED";

  const MANUAL_RENDER_ACTION: PreflightStatus = manualRenderActionForBlueprint(base.BLUEPRINT_CONFIGURATION, LIVE_RENDER_DISK);

  return {
    ...base,
    liveHealthProbe,
    LIVE_RENDER_DISK,
    LIVE_PERSISTENCE,
    RENDER_PERSISTENCE_READY,
    MANUAL_RENDER_ACTION,
  };
}
