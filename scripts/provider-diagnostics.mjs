#!/usr/bin/env node
/**
 * Safe provider diagnostics. Default: dry-run, no network, no writes.
 * Requires BUZZARD_PROVIDER_PROBE=1 to even request a probe, and this
 * harness still does not open sockets in this slice.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const software = require("../server/lib/software");
const { db } = require("../server/lib/db");

software.initialize(db);
const allowNetwork = process.argv.includes("--allow-network");
const result = software.providerDiagnostics.diagnose({ allowNetwork });
const blob = JSON.stringify(result, null, 2);
if (/sk-|rk_|whsec_|BEGIN PRIVATE|TWILIO_AUTH_TOKEN=/.test(blob)) {
  console.error("refusing to print a payload that looks like it contains secrets");
  process.exit(2);
}
console.log(blob);
process.exit(result.ok ? 0 : 1);
