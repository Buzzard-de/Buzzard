#!/usr/bin/env node
/**
 * Write server/data/build-info.json for deployment identity on Render
 * (git metadata may be unavailable at runtime on some hosts).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "server", "data");
const outFile = path.join(outDir, "build-info.json");

function git(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const commit =
  process.env.RENDER_GIT_COMMIT ||
  process.env.GITHUB_SHA ||
  git("git rev-parse HEAD") ||
  "unknown";
const branch =
  process.env.RENDER_GIT_BRANCH ||
  process.env.GITHUB_REF_NAME ||
  git("git rev-parse --abbrev-ref HEAD") ||
  "unknown";

const payload = {
  commit,
  branch,
  buildTime: new Date().toISOString(),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`write-build-info: ${commit.slice(0, 12)} on ${branch}`);
