#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("node", ["scripts/render-persistence-evidence-bridge-cli.mjs", "gate"], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r.status ?? 1);
