#!/usr/bin/env node
/**
 * Run Buzzard Final Production Guard MAX and save JSON report.
 *
 * Usage:
 *   node scripts/run-production-guard.mjs
 *   BUZZARD_API_URL=http://localhost:3001 node scripts/run-production-guard.mjs
 *   BUZZARD_API_URL=https://buzzard-api.onrender.com node scripts/run-production-guard.mjs
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");
const SITE = (process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const reportDir = path.join(process.cwd(), "exports");
const stamp = new Date().toISOString().slice(0, 10);
const apiTag = API.includes("onrender.com") ? "live" : "local";
const reportPath = path.join(reportDir, `production-verification-${apiTag}-${stamp}.json`);

const py = spawn(
  "python3",
  [
    path.join("intelligence", "buzzard_final_production_guard_max.py"),
    "--api",
    API,
    "--site",
    SITE,
    "--report",
    reportPath,
  ],
  { stdio: ["ignore", "pipe", "pipe"], cwd: process.cwd(), env: { ...process.env, BUZZARD_P1_CATALOG: "1", BUZZARD_SALES_ENABLED: "0" } }
);

let stdout = "";
let stderr = "";
py.stdout.on("data", (d) => { stdout += d; process.stdout.write(d); });
py.stderr.on("data", (d) => { stderr += d; process.stderr.write(d); });

py.on("close", (code) => {
  if (fs.existsSync(reportPath)) {
    console.error(`\nSaved: ${reportPath}`);
  }
  process.exit(code ?? 1);
});
