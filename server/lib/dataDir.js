/**
 * Location of the runtime JSON stores: admin users, sessions, lockouts, 2FA,
 * audit and security logs, automation events, rate-limit buckets, and the
 * customer, order, fulfilment and queue files next to them.
 *
 * Defaults to server/data. BUZZARD_DATA_DIR moves them, which is what keeps
 * them across redeploys on a persistent disk and what lets tests run against
 * a throwaway directory. Automated test processes get their own directory per
 * worker unless one is configured, the same way dbPaths.js isolates SQLite.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const defaultDataDir = path.join(__dirname, "..", "data");

function isAutomatedTestProcess() {
  if (process.env.VITEST === "true") return true;
  const args = [...process.execArgv, ...process.argv];
  if (args.includes("--test")) return true;
  return process.argv.some((arg) => /(?:^|[\\/])__tests__[\\/].+\.test\.mjs$/.test(arg));
}

function isolatedTestDataDir() {
  const worker = process.env.VITEST_POOL_ID || process.env.VITEST_WORKER_ID || String(process.pid);
  return path.join(os.tmpdir(), "buzzard-test-data", `worker-${worker}`);
}

function resolveDataDir() {
  const configured = String(process.env.BUZZARD_DATA_DIR || "").trim();
  if (configured) return path.resolve(configured);
  if (isAutomatedTestProcess()) return isolatedTestDataDir();
  return defaultDataDir;
}

function ensureDataDir(dir = resolveDataDir()) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getDataDirInfo() {
  const dir = resolveDataDir();
  return {
    path: dir,
    mode: process.env.BUZZARD_DATA_DIR ? "custom_path" : dir === defaultDataDir ? "default" : "test_isolated",
    // True when the stores live under the OS temp dir, i.e. a throwaway test stack.
    isolated: dir.startsWith(os.tmpdir() + path.sep),
  };
}

/**
 * Accounts, sessions and the logs live in the data directory. Production
 * needs a configured, usable location: without one they would start empty
 * after every deploy. Returns null when it is fine, otherwise the problem.
 */
function productionDataDirProblem() {
  if (!String(process.env.BUZZARD_DATA_DIR || "").trim()) {
    return { code: "data_dir_unset", message: "BUZZARD_DATA_DIR must point to persistent storage in production" };
  }
  const dir = resolveDataDir();
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
    if (!fs.statSync(dir).isDirectory()) throw Object.assign(new Error("not a directory"), { code: "ENOTDIR" });
  } catch (err) {
    return { code: "data_dir_not_writable", message: `BUZZARD_DATA_DIR cannot be used (${err.code || "unusable"})` };
  }
  return null;
}

module.exports = { defaultDataDir, resolveDataDir, ensureDataDir, getDataDirInfo, productionDataDirProblem };
