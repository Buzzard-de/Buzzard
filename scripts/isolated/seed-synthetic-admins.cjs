#!/usr/bin/env node
/**
 * Write synthetic admin accounts into an isolated data directory.
 *
 * One account per existing role, each with a random password that exists only
 * in the credentials file next to the data directory (mode 0600). Real
 * accounts, hashes and sessions are never read or copied.
 *
 *   node scripts/isolated/seed-synthetic-admins.cjs <dataDir> <credentialsFile>
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { hashPassword } = require("../../server/lib/password");
const { PERMISSIONS } = require("../../server/lib/rbac");

const ROLES = ["administrator", "catalog_manager", "order_manager", "read_only"];

function fail(message) {
  console.error(`[seed-synthetic-admins] ${message}`);
  process.exit(64);
}

const [dataDirArg, credentialsArg] = process.argv.slice(2);
if (!dataDirArg || !credentialsArg) fail("usage: seed-synthetic-admins.cjs <dataDir> <credentialsFile>");

const dataDir = fs.realpathSync(dataDirArg);
const tmpRoot = fs.realpathSync(os.tmpdir());
if (!dataDir.startsWith(tmpRoot + path.sep)) fail(`data directory must be under ${tmpRoot}`);
if (!fs.existsSync(path.join(dataDir, ".buzzard-isolated"))) fail("data directory has no .buzzard-isolated marker");
for (const role of ROLES) {
  if (!PERMISSIONS[role]) fail(`role ${role} is not defined in server/lib/rbac.js`);
}

const credentials = {};
const users = ROLES.map((role) => {
  const password = crypto.randomBytes(18).toString("base64url");
  const email = `synthetic-${role.replace(/_/g, "-")}@isolated.buzzard.test`;
  credentials[role] = { email, password };
  return {
    id: `usr-synthetic-${role.replace(/_/g, "-")}`,
    email,
    name: `Synthetic ${role}`,
    role,
    password_hash: hashPassword(password),
  };
});

fs.writeFileSync(path.join(dataDir, "admin-users.json"), JSON.stringify(users, null, 2), { mode: 0o600 });
fs.writeFileSync(path.resolve(credentialsArg), JSON.stringify(credentials, null, 2), { mode: 0o600 });
console.error(`[seed-synthetic-admins] ${users.length} synthetic accounts (${ROLES.join(", ")})`);
