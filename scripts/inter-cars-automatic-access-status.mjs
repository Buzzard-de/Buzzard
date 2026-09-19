#!/usr/bin/env node
/**
 * Inter Cars access status — #362 evidence bridge report (metadata only).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "url";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SALES_ENABLED = "0";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = process.argv.includes("--json");
const args = ["scripts/inter-cars-access-evidence-bridge-cli.mjs", "status"];
if (json) args.push("--json");
const r = spawnSync("node", args, { cwd: root, stdio: "inherit" });
process.exit(r.status ?? 1);
