#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { proveRestore } = require("../server/lib/survival/proveBackupRestore.js");

const started = Date.now();
const result = proveRestore();
const out = {
  ok: result.ok,
  consistent: result.consistent,
  productionTouched: result.productionTouched,
  measuredRestoreMs: result.measuredRestoreMs,
  wallMs: Date.now() - started,
  offsite: result.copies.offsite,
  immutableIsChmodOnly: true,
  worm: "BLOCKED",
  note: "Isolated temp DB fixture. Not production restore. chmod 444 is not WORM.",
};
const dest = path.join("docs/MASTER_COMMAND/2026-11-05-mc3", "isolated-restore-lab.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(result.ok && !result.productionTouched ? 0 : 1);
