/**
 * JSON file persistence for the runtime stores (admin users, sessions, logs).
 *
 * - A write goes to a temporary file in the same directory and is renamed over
 *   the target, so a reader or a crash never sees a half-written file.
 * - Before the rename the current version is kept as `<file>.bak`. If the main
 *   file later turns out unreadable, that backup is used instead of an empty
 *   value.
 * - A file that exists but cannot be parsed is copied to
 *   `<file>.corrupt-<hash>` before anything else happens. If that copy cannot
 *   be made, writes to the file are refused: replacing it would destroy the
 *   only remaining version of the history.
 * - `withFileLock` serialises read-modify-write cycles across processes.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PRIVATE_FILE_MODE = 0o600;
const PRIVATE_DIR_MODE = 0o700;
// An unreadable lock file, or one from another machine, is only cleared after this long.
const LOCK_STALE_MS = 10_000;
const LOCK_FOREIGN_STALE_MS = 120_000;
// How long a writer waits for a live holder before it gives up without writing.
const LOCK_WAIT_MS = (() => {
  const configured = Number(process.env.BUZZARD_STORE_LOCK_WAIT_MS);
  return Number.isInteger(configured) && configured >= 100 && configured <= 300_000 ? configured : 30_000;
})();

const reportedCorrupt = new Set();
const reportedRestored = new Set();
const unpreserved = new Set();
const heldLocks = new Map();

class StoreUnreadableError extends Error {
  constructor(file) {
    super(`refusing to overwrite ${path.basename(file)}: it is unreadable and no copy of it could be kept`);
    this.code = "STORE_UNREADABLE";
    this.file = file;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: PRIVATE_DIR_MODE });
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function preserveCorruptFile(file, raw) {
  const digest = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
  const copy = `${file}.corrupt-${digest}`;
  try {
    if (!fs.existsSync(copy)) {
      fs.writeFileSync(copy, raw, { mode: PRIVATE_FILE_MODE, flag: "wx" });
    }
  } catch {
    unpreserved.add(file);
    console.error(`[json-store] ${path.basename(file)} is not valid and could not be copied aside; writes to it are refused`);
    return null;
  }
  unpreserved.delete(file);
  if (!reportedCorrupt.has(copy)) {
    reportedCorrupt.add(copy);
    console.error(`[json-store] ${path.basename(file)} is not valid; original kept as ${path.basename(copy)}`);
  }
  return copy;
}

function parse(raw, validate) {
  try {
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) return { ok: false };
    return { ok: true, value: parsed };
  } catch {
    return { ok: false };
  }
}

/**
 * State of a store file: "missing", "empty", "ok", "restored" (main file bad,
 * backup used) or "corrupt" (nothing usable).
 */
function readBackup(file, validate, why) {
  try {
    const backup = parse(fs.readFileSync(`${file}.bak`, "utf8"), validate);
    if (backup.ok) {
      if (!reportedRestored.has(file)) {
        reportedRestored.add(file);
        console.error(`[json-store] ${path.basename(file)} is ${why}: using the previous version from ${path.basename(file)}.bak`);
      }
      return { state: "restored", value: backup.value, reason: why };
    }
  } catch {
    /* no backup */
  }
  return null;
}

function inspectJsonFile(file, { validate } = {}) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") return { state: "corrupt", reason: err.code || "unreadable" };
    // A store that was written before leaves a previous version behind. If only that
    // is left, the file was removed: starting empty would drop what it held.
    return readBackup(file, validate, "missing") || { state: "missing" };
  }
  if (!raw.trim()) return readBackup(file, validate, "empty") || { state: "empty" };
  const main = parse(raw, validate);
  if (main.ok) return { state: "ok", value: main.value };

  preserveCorruptFile(file, raw);
  return readBackup(file, validate, "not valid") || { state: "corrupt", reason: "invalid" };
}

function readJsonFile(file, fallback, options = {}) {
  const result = inspectJsonFile(file, options);
  return result.state === "ok" || result.state === "restored" ? result.value : fallback;
}

function readJsonArray(file) {
  return readJsonFile(file, [], { validate: Array.isArray });
}

function keepBackup(file) {
  const backup = `${file}.bak`;
  try {
    const current = fs.readFileSync(file, "utf8");
    if (!current.trim() || !parse(current).ok) return;
    const tmp = `${backup}.${process.pid}.${crypto.randomBytes(4).toString("hex")}`;
    try {
      fs.linkSync(file, tmp);
    } catch {
      fs.writeFileSync(tmp, current, { mode: PRIVATE_FILE_MODE });
    }
    fs.renameSync(tmp, backup);
  } catch {
    /* nothing to back up */
  }
}

function writeJsonAtomic(file, data, { durable = false, backup = true } = {}) {
  if (unpreserved.has(file)) {
    const current = inspectJsonFile(file);
    if (unpreserved.has(file) && current.state === "corrupt") throw new StoreUnreadableError(file);
  }
  const dir = path.dirname(file);
  ensureDir(dir);
  const serialized = JSON.stringify(data, null, 2);
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  const fd = fs.openSync(tmp, "wx", PRIVATE_FILE_MODE);
  try {
    fs.writeFileSync(fd, serialized, "utf8");
    if (durable) fs.fsyncSync(fd);
  } catch (err) {
    fs.closeSync(fd);
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  fs.closeSync(fd);
  try {
    if (backup) keepBackup(file);
    fs.renameSync(tmp, file);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}

/** Start time of a process as the kernel reports it; tells a live owner from a reused pid. Linux only. */
function processStartTicks(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] || null;
  } catch {
    return null;
  }
}

const HOST = os.hostname();
const OWN_START = processStartTicks(process.pid);

function readLock(lockFile) {
  let raw;
  try {
    raw = fs.readFileSync(lockFile, "utf8");
  } catch (err) {
    return err.code === "ENOENT" ? null : { raw: null, owner: null };
  }
  try {
    return { raw, owner: JSON.parse(raw) };
  } catch {
    return { raw, owner: null };
  }
}

/**
 * A lock is abandoned when the process that took it no longer exists. A lock
 * held by a live process is never taken over, however long it takes: two
 * writers at once is exactly what the lock is there to prevent.
 */
function isAbandoned(lockFile, lock) {
  const ageMs = () => {
    try {
      return Date.now() - fs.statSync(lockFile).mtimeMs;
    } catch {
      return 0;
    }
  };
  const owner = lock.owner;
  if (!owner || !Number.isInteger(owner.pid)) return ageMs() > LOCK_STALE_MS;
  // Another machine sharing the directory: its processes cannot be checked from here.
  if (owner.host !== HOST) return ageMs() > LOCK_FOREIGN_STALE_MS;
  try {
    process.kill(owner.pid, 0);
  } catch (err) {
    if (err.code !== "EPERM") return true;
  }
  if (owner.start && OWN_START) {
    const start = processStartTicks(owner.pid);
    if (start !== null && start !== owner.start) return true;
  }
  return false;
}

/** Removes an abandoned lock, making sure it is still the one that was judged abandoned. */
function clearAbandoned(lockFile, lock) {
  const aside = `${lockFile}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.stale`;
  try {
    fs.renameSync(lockFile, aside);
  } catch {
    return;
  }
  let taken = null;
  try {
    taken = fs.readFileSync(aside, "utf8");
  } catch {
    /* gone */
  }
  if (taken !== null && taken !== lock.raw) {
    // Someone else cleared the old lock and took a new one in between: give it back.
    try {
      fs.linkSync(aside, lockFile);
    } catch (err) {
      console.error(`[json-store] could not restore a lock on ${path.basename(lockFile)} (${err.code || "error"})`);
    }
  }
  fs.rmSync(aside, { force: true });
}

function acquireLock(lockFile) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  const token = JSON.stringify({ pid: process.pid, host: HOST, start: OWN_START, at: Date.now(), id: crypto.randomBytes(8).toString("hex") });
  // The lock appears with its content in one step, so nobody ever reads a half-written one.
  const pending = `${lockFile}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.new`;
  fs.writeFileSync(pending, token, { mode: PRIVATE_FILE_MODE, flag: "wx" });
  try {
    for (;;) {
      try {
        fs.linkSync(pending, lockFile);
        return token;
      } catch (err) {
        if (err.code !== "EEXIST") {
          // No hard links on this file system: create the lock directly. A reader may then see it
          // empty for a moment, which counts as held until LOCK_STALE_MS has passed.
          try {
            fs.writeFileSync(lockFile, token, { mode: PRIVATE_FILE_MODE, flag: "wx" });
            return token;
          } catch (inner) {
            if (inner.code !== "EEXIST") throw inner;
          }
        }
      }
      const lock = readLock(lockFile);
      if (lock === null) continue;
      if (isAbandoned(lockFile, lock)) {
        clearAbandoned(lockFile, lock);
        continue;
      }
      if (Date.now() > deadline) {
        const error = new Error(`could not lock ${path.basename(lockFile, ".lock")} within ${LOCK_WAIT_MS / 1000}s; nothing was written`);
        error.code = "STORE_LOCK_TIMEOUT";
        throw error;
      }
      sleepSync(2 + Math.floor(Math.random() * 8));
    }
  } finally {
    fs.rmSync(pending, { force: true });
  }
}

function releaseLock(lockFile, token) {
  try {
    if (fs.readFileSync(lockFile, "utf8") === token) fs.rmSync(lockFile, { force: true });
  } catch {
    /* already gone */
  }
}

/** Runs `fn` while holding an exclusive lock for `file`, across processes. Re-entrant within one process. */
function withFileLock(file, fn) {
  const lockFile = `${file}.lock`;
  const held = heldLocks.get(lockFile);
  if (held) {
    held.depth += 1;
    try {
      return fn();
    } finally {
      held.depth -= 1;
    }
  }
  ensureDir(path.dirname(file));
  const token = acquireLock(lockFile);
  heldLocks.set(lockFile, { depth: 1, token });
  try {
    return fn();
  } finally {
    heldLocks.delete(lockFile);
    releaseLock(lockFile, token);
  }
}

/** Read-modify-write of a JSON list under the file lock. `mutate` returns the new list. */
function updateJsonArray(file, mutate, options = {}) {
  return withFileLock(file, () => {
    const next = mutate(readJsonArray(file));
    writeJsonAtomic(file, next, options);
    return next;
  });
}

module.exports = {
  readJsonFile,
  readJsonArray,
  inspectJsonFile,
  writeJsonAtomic,
  withFileLock,
  updateJsonArray,
  preserveCorruptFile,
  StoreUnreadableError,
  PRIVATE_FILE_MODE,
  PRIVATE_DIR_MODE,
};
