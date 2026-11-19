import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const libDir = fileURLToPath(new URL("../../lib/", import.meta.url));

/** A new empty directory under the OS temp dir for one test's JSON stores. */
export function tempDataDir(label = "store") {
  return mkdtempSync(path.join(tmpdir(), `buzzard-${label}-`));
}

/**
 * Loads server/lib modules again with the given environment, so module-level
 * state (session map, limiter, data directory, signing key) starts from zero.
 * Returns the loader; the environment stays applied until `restore()`.
 */
export function freshServerLib(env = {}) {
  const previous = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = String(value);
  }
  for (const id of Object.keys(require.cache)) {
    if (id.startsWith(libDir)) delete require.cache[id];
  }
  return {
    load: (name) => require(path.join(libDir, name)),
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    },
  };
}

/** Writes synthetic admin accounts (one per role) and returns their login data. */
export function seedSyntheticAdmins(dataDir, roles = ["administrator", "read_only"]) {
  const { hashPassword } = require(path.join(libDir, "password.js"));
  const accounts = roles.map((role, index) => ({
    id: `usr-synthetic-${role.replace(/_/g, "-")}`,
    email: `synthetic-${role}@unit.buzzard.test`,
    name: `Synthetic ${role}`,
    role,
    password: `synthetic-${role}-${index}-${Math.random().toString(36).slice(2)}`,
  }));
  writeFileSync(
    path.join(dataDir, "admin-users.json"),
    JSON.stringify(accounts.map(({ password, ...rest }) => ({ ...rest, password_hash: hashPassword(password) })))
  );
  return Object.fromEntries(accounts.map((account) => [account.role, account]));
}

export function fakeRequest(ip = "198.51.100.7", headers = {}) {
  return { headers: { "user-agent": "vitest", ...headers }, socket: { remoteAddress: ip } };
}
