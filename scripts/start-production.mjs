#!/usr/bin/env node
/**
 * Production start entrypoint.
 * - Render (RENDER=true): Buzzard API → node server/server.js
 * - Local preview: static export in out/ via serve (next start incompatible with output: export)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT || "3000";
const onRender = process.env.RENDER === "true" || Boolean(process.env.RENDER_SERVICE_ID);

if (onRender || process.env.BUZZARD_START_API === "1") {
  console.log("[start] Render/API mode → node server/server.js");
  const result = spawnSync("node", ["server/server.js"], { cwd: root, stdio: "inherit", env: process.env });
  process.exit(result.status ?? 1);
}

console.log(`[start] Static export preview → serve out on port ${port}`);
const result = spawnSync(
  "npx",
  ["--yes", "serve@latest", "out", "-l", String(port)],
  { cwd: root, stdio: "inherit", env: process.env }
);
process.exit(result.status ?? 1);
