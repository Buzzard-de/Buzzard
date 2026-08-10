#!/usr/bin/env node
/**
 * Security check — npm audit + config sanity + security module presence.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let warnings = 0;

function warn(msg) {
  console.log(`  [WARN] ${msg}`);
  warnings += 1;
}

function pass(msg) {
  console.log(`  [OK] ${msg}`);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function fileContains(relativePath, needle) {
  if (!fileExists(relativePath)) return false;
  return fs.readFileSync(path.join(root, relativePath), "utf8").includes(needle);
}

console.log("Buzzard security check\n");

console.log("Frontend audit (high+):");
try {
  execSync("npm audit --audit-level=high", { stdio: "inherit", cwd: root });
  pass("frontend npm audit");
} catch {
  warn("frontend has high vulnerabilities — review npm audit (Next/sharp may need major upgrade)");
}

console.log("\nServer audit (moderate+):");
try {
  execSync("npm audit --audit-level=moderate", { stdio: "inherit", cwd: `${root}/server` });
  pass("server npm audit");
} catch {
  warn("server audit reported issues — run npm audit in server/");
}

console.log("\nCore protections:");
const checks = [
  ["server/lib/authSecurity.js", "Auth rate limits module"],
  ["server/lib/accountLockout.js", "Account lockout module"],
  ["server/lib/totp.js", "TOTP module"],
  ["server/lib/adminTwoFactor.js", "Admin 2FA module"],
  ["server/plugins/securityPlugin.js", "Security plugin"],
  ["app/admin/security-dashboard/page.tsx", "Security dashboard page"],
  ["components/admin/AdminSecurityDashboardPanel.tsx", "Security dashboard panel"],
  ["public/.well-known/security.txt", "security.txt"],
];

for (const [file, label] of checks) {
  if (fileExists(file)) pass(label);
  else warn(`missing ${file}`);
}

if (fileContains("server/lib/auth.js", "accountLockout")) pass("Admin login lockout wired");
else warn("Admin login lockout not wired");

if (fileContains("server/plugins/adminAuthPlugin.js", "/api/admin/login/2fa")) pass("Admin 2FA login route");
else warn("Admin 2FA login route missing");

if (fileContains("components/ContactForm.tsx", "_honey")) pass("Contact honeypot field");
else warn("Contact honeypot missing");

if (fileContains("components/ContactForm.tsx", "_formStarted")) pass("Contact time-trap field");
else warn("Contact time-trap missing");

console.log("\nRecommended (manual):");
console.log("  - Cloudflare in front of buzzard24.de (see docs/SECURITY.md)");
console.log("  - Render JWT_SECRET + ADMIN_PASSWORD as secrets");
console.log("  - Enable Admin 2FA under /admin/security-dashboard/");

console.log(`\nSecurity check finished (${warnings} warning(s)).`);
