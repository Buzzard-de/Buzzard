/**
 * One heavy local process at a time, across Vitest workers.
 * A dead holder is cleared. A live holder is waited on.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const lockFile = path.join(os.tmpdir(), "buzzard-heavy-process.lock");

function holderAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function tryAcquire() {
  try {
    const fd = fs.openSync(lockFile, "wx");
    fs.writeSync(fd, String(process.pid));
    return fd;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let pid = 0;
    try { pid = Number(fs.readFileSync(lockFile, "utf8")); } catch { pid = 0; }
    if (!holderAlive(pid)) {
      try { fs.unlinkSync(lockFile); } catch { /* another worker took it */ }
    }
    return null;
  }
}

function release(fd) {
  try { fs.closeSync(fd); } catch { /* closed */ }
  try {
    const pid = Number(fs.readFileSync(lockFile, "utf8"));
    if (pid === process.pid) fs.unlinkSync(lockFile);
  } catch { /* already released */ }
}

function waitSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withHeavyProcess(work, waitMs = 180000) {
  const start = Date.now();
  let fd = null;
  while (fd === null) {
    fd = tryAcquire();
    if (fd !== null) break;
    if (Date.now() - start > waitMs) {
      return { ok: false, code: "MODEL_UNAVAILABLE", reason: "PROCESS_LOCK_TIMEOUT", out: "", err: "" };
    }
    waitSync(100);
  }
  try {
    return work();
  } finally {
    release(fd);
  }
}

async function withHeavyProcessAsync(work, waitMs = 180000) {
  const start = Date.now();
  let fd = null;
  while (fd === null) {
    fd = tryAcquire();
    if (fd !== null) break;
    if (Date.now() - start > waitMs) {
      return { ok: false, code: "MODEL_UNAVAILABLE", reason: "PROCESS_LOCK_TIMEOUT", out: "", err: "" };
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  try {
    return await work();
  } finally {
    release(fd);
  }
}

module.exports = { withHeavyProcess, withHeavyProcessAsync };
