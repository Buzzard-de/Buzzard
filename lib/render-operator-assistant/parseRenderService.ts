import fs from "fs";
import path from "path";

export interface RenderBuzzardApiBlueprint {
  serviceName: string;
  mountPath: string | null;
  diskSizeGB: number | null;
  diskName: string | null;
  dbPathEnv: string | null;
  backupDirEnv: string | null;
  healthCheckPath: string | null;
  /** Derived only when service name is known — operator must confirm in Render Dashboard */
  defaultApiBaseUrl: string | null;
  healthDbUrl: string | null;
  renderYamlPresent: boolean;
}

function extractBuzzardApiBlock(yaml: string): string | null {
  const start = yaml.indexOf("name: buzzard-api");
  if (start < 0) return null;
  const after = yaml.slice(start);
  const nextService = after.search(/\n  - type: web\n    name: buzzard-(?!api)/);
  if (nextService > 0) return after.slice(0, nextService);
  return after;
}

function readEnvValue(block: string, key: string): string | null {
  const re = new RegExp(`- key: ${key}[\\s\\S]*?value:\\s*(.+)`);
  const m = block.match(re);
  return m?.[1]?.trim() ?? null;
}

export function parseBuzzardApiFromRenderYaml(cwd = process.cwd()): RenderBuzzardApiBlueprint {
  const renderYamlPath = path.join(cwd, "render.yaml");
  const renderYamlPresent = fs.existsSync(renderYamlPath);
  const yaml = renderYamlPresent ? fs.readFileSync(renderYamlPath, "utf8") : "";
  const block = yaml ? extractBuzzardApiBlock(yaml) : null;
  const serviceName = block ? "buzzard-api" : "UNKNOWN";

  let mountPath: string | null = null;
  let diskSizeGB: number | null = null;
  let diskName: string | null = null;
  if (block) {
    mountPath = block.match(/mountPath:\s*(\S+)/)?.[1] ?? null;
    diskSizeGB = block.match(/sizeGB:\s*(\d+)/) ? Number(block.match(/sizeGB:\s*(\d+)/)![1]) : null;
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
    renderYamlPresent,
  };
}

export function resolveBuzzardApiBaseUrl(cwd = process.cwd()): string {
  if (process.env.BUZZARD_API_URL?.trim()) {
    return process.env.BUZZARD_API_URL.replace(/\/$/, "");
  }
  const parsed = parseBuzzardApiFromRenderYaml(cwd);
  if (parsed.defaultApiBaseUrl) return parsed.defaultApiBaseUrl;
  throw new Error("BUZZARD_API_URL not set and buzzard-api not found in render.yaml");
}
