import fs from "fs";
import path from "path";
import type { DeploymentConfigCheck } from "./types";

export function checkDeploymentConfiguration(): DeploymentConfigCheck {
  const renderYaml = path.join(process.cwd(), "render.yaml");
  const renderYamlPresent = fs.existsSync(renderYaml);
  const notes: string[] = [];

  let persistentDiskInBlueprint = false;
  let buzzardDbPathInBlueprint = false;
  let backupDirInBlueprint = false;
  let healthCheckConfigured = false;

  if (renderYamlPresent) {
    const yaml = fs.readFileSync(renderYaml, "utf8");
    persistentDiskInBlueprint = yaml.includes("mountPath: /var/data");
    buzzardDbPathInBlueprint = yaml.includes("BUZZARD_DB_PATH") && yaml.includes("/var/data/buzzard.db");
    backupDirInBlueprint = yaml.includes("BUZZARD_BACKUP_DIR") && yaml.includes("/var/data/backups");
    healthCheckConfigured = yaml.includes("healthCheckPath: /api/health");
  } else {
    notes.push("render.yaml missing");
  }

  let status: DeploymentConfigCheck["status"] = "PASS";
  if (!renderYamlPresent) status = "BLOCKED";
  else if (!persistentDiskInBlueprint || !buzzardDbPathInBlueprint) status = "WARNING";

  if (!persistentDiskInBlueprint) {
    notes.push("Blueprint missing persistent disk at /var/data");
  }

  return {
    renderYamlPresent,
    persistentDiskInBlueprint,
    buzzardDbPathInBlueprint,
    backupDirInBlueprint,
    healthCheckConfigured,
    status,
    notes: notes.join("; ") || "Render Blueprint supports persistent disk configuration",
  };
}
