#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = process.argv.includes("--json");
const args = ["scripts/render-persistence-evidence-bridge-cli.mjs", "status"];
if (json) args.push("--json");
const r = spawnSync("node", args, { cwd: root, stdio: "inherit" });
process.exit(r.status ?? 1);
