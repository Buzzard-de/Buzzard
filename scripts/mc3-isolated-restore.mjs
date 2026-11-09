#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { proveRestore } = require("../server/lib/survival/proveBackupRestore.js");
const { runIsolatedDisasterDrill } = require("../server/lib/survival/isolatedDisasterDrill.js");

const started = Date.now();
const result = proveRestore();
const drill = runIsolatedDisasterDrill();
const out = {
  ok: result.ok && drill.status === "ISOLATED_RESTORE_TESTED",
  consistent: result.consistent,
  productionTouched: result.productionTouched || drill.productionTouched,
  productionDrVerified: false,
  measuredRestoreMs: result.measuredRestoreMs,
  drillMs: drill.measuredMs,
  wallMs: Date.now() - started,
  offsite: result.copies.offsite,
  immutableIsChmodOnly: true,
  worm: "BLOCKED",
  drill,
  note: "Isolated temp DB fixture. Not production restore. chmod 444 is not WORM.",
};
const dest = path.join("docs/MASTER_COMMAND/2026-11-05-mc3", "isolated-restore-lab.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(result.ok && !result.productionTouched ? 0 : 1);
