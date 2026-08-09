#!/usr/bin/env node
/**
 * Cloud Agent start hook: provision buzzard-api on Render when RENDER_API_KEY is available.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.RENDER_API_KEY?.trim();

if (!key) {
  console.log("[buzzard] RENDER_API_KEY not set — skip Render auto-provision.");
  process.exit(0);
}

console.log("[buzzard] RENDER_API_KEY detected — bootstrapping buzzard-api on Render…");
const result = spawnSync("node", [path.join(root, "scripts/render-bootstrap.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
