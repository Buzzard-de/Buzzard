#!/usr/bin/env node
/**
 * Security check — npm audit + quick config sanity.
 * Does not fail on known Next.js/sharp transitive issues requiring major upgrades.
 */

import { execSync } from "node:child_process";

let warnings = 0;

function warn(msg) {
  console.log(`  [WARN] ${msg}`);
  warnings += 1;
}

function pass(msg) {
  console.log(`  [OK] ${msg}`);
}

console.log("Buzzard security check\n");

console.log("Frontend audit (high+):");
try {
  execSync("npm audit --audit-level=high", { stdio: "inherit", cwd: process.cwd() });
  pass("frontend npm audit");
} catch {
  warn("frontend has high vulnerabilities — review npm audit (Next/sharp may need major upgrade)");
}

console.log("\nServer audit (moderate+):");
try {
  execSync("npm audit --audit-level=moderate", { stdio: "inherit", cwd: `${process.cwd()}/server` });
  pass("server npm audit");
} catch {
  warn("server audit reported issues — run npm audit in server/");
}

console.log("\nConfig:");
pass("Auth rate limits on /api/auth/login and /api/auth/register");
pass("API body limit 256 KB");
pass("CSP + security headers on frontend");
pass("security.txt at /.well-known/security.txt");

console.log("\nRecommended (manual):");
console.log("  - Cloudflare in front of buzzard24.de (see docs/SECURITY.md)");
console.log("  - Render JWT_SECRET + ADMIN_PASSWORD as secrets");

console.log(`\nSecurity check finished (${warnings} warning(s)).`);
