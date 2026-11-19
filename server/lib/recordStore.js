/**
 * Append-only record lists kept as JSON files: the audit log, the security
 * log and the automation event list.
 *
 * - Every append is a read-modify-write under the file lock, so entries from
 *   several processes (or from the two audit modules) are never lost.
 * - The working file is bounded. Entries that leave it are first appended to
 *   `<name>.archive.jsonl` (one JSON document per line) and only then removed
 *   from the working file. A crash in between leaves an entry in both places,
 *   never in neither. Nothing is discarded.
 * - Each entry carries `prev` (the hash of the entry before it) and `hash`
 *   (SHA-256 over `prev` and the entry). Changing, removing or inserting an
 *   entry in the middle breaks the chain; `verifyChain` reports where. Entries
 *   written before the chain existed stay as they are and are counted as
 *   `legacy`. Cutting entries off the end is not detectable from the file
 *   alone; that needs a copy of the last hash kept somewhere else.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { inspectJsonFile, writeJsonAtomic, withFileLock, PRIVATE_FILE_MODE } = require("./jsonFileStore");

const DEFAULT_KEEP = 5000;
const ARCHIVE_ROTATE_BYTES = 32 * 1024 * 1024;

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bodyOf(entry) {
  const { hash: _hash, ...body } = entry;
  return body;
}

function hashEntry(prev, entry) {
  return sha256(`${prev || ""}\n${JSON.stringify(bodyOf(entry))}`);
}

/** Link value for the entry that follows `last`. */
function linkAfter(last) {
  if (last === undefined) return null;
  if (isRecord(last) && typeof last.hash === "string") return last.hash;
  return sha256(JSON.stringify(last));
}

function archiveFileOf(file) {
  const parsed = path.parse(file);
  return path.join(parsed.dir, `${parsed.name}.archive.jsonl`);
}

function archiveFilesOf(file) {
  const parsed = path.parse(file);
  const prefix = `${parsed.name}.archive`;
  try {
    return fs
      .readdirSync(parsed.dir)
      .filter((name) => name.startsWith(prefix) && name.endsWith(".jsonl"))
      .sort()
      .map((name) => path.join(parsed.dir, name));
  } catch {
    return [];
  }
}

function appendToArchive(file, entries) {
  if (!entries.length) return;
  const archive = archiveFileOf(file);
  try {
    if (fs.statSync(archive).size > ARCHIVE_ROTATE_BYTES) {
      const parsed = path.parse(archive);
      const stamp = new Date().toISOString().replace(/[-:.]/g, "");
      fs.renameSync(archive, path.join(parsed.dir, `${parsed.name}-${stamp}.jsonl`));
    }
  } catch {
    /* no archive yet */
  }
  const lines = entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
  const fd = fs.openSync(archive, "a", PRIVATE_FILE_MODE);
  try {
    fs.writeSync(fd, lines);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function readArchive(file) {
  const entries = [];
  for (const archive of archiveFilesOf(file)) {
    let raw;
    try {
      raw = fs.readFileSync(archive, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line));
      } catch {
        entries.push({ unreadable: true });
      }
    }
  }
  return entries;
}

function readRecords(file) {
  const store = inspectJsonFile(file, { validate: Array.isArray });
  return store.state === "ok" || store.state === "restored" ? store.value : [];
}

/**
 * Appends one record. `build(entries)` may return a different record after
 * seeing the current list (used for duplicate detection); returning `null`
 * appends nothing.
 */
function appendRecord(file, record, { keep = DEFAULT_KEEP, build } = {}) {
  return withFileLock(file, () => {
    const entries = readRecords(file);
    const candidate = build ? build(entries, record) : record;
    if (!candidate) return null;
    const { hash: _hash, prev: _prev, ...clean } = candidate;
    const entry = { ...clean, prev: linkAfter(entries[entries.length - 1]) };
    entry.hash = hashEntry(entry.prev, entry);
    entries.push(entry);
    if (entries.length > keep) {
      appendToArchive(file, entries.slice(0, entries.length - keep));
      writeJsonAtomic(file, entries.slice(-keep));
    } else {
      writeJsonAtomic(file, entries);
    }
    return entry;
  });
}

/**
 * Checks the links of a record list.
 * `brokenAt` is the index of the first entry that does not fit, or null.
 */
function verifyChain(entries) {
  const result = { ok: true, entries: entries.length, chained: 0, legacy: 0, brokenAt: null, reason: null };
  let chainStarted = false;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const fail = (reason) => Object.assign(result, { ok: false, brokenAt: index, reason });
    if (!isRecord(entry) || typeof entry.hash !== "string") {
      if (chainStarted) return fail("unchained_entry_after_chain_start");
      result.legacy += 1;
      continue;
    }
    if (hashEntry(entry.prev, entry) !== entry.hash) return fail("entry_changed");
    if (index > 0 && entry.prev !== linkAfter(entries[index - 1])) return fail("link_broken");
    if (index === 0 && entry.prev !== null && typeof entry.prev !== "string") return fail("link_broken");
    chainStarted = true;
    result.chained += 1;
  }
  return result;
}

/** Chain check of the working file, and of archive plus working file as one list. */
function verifyRecordFile(file) {
  const current = readRecords(file);
  const working = verifyChain(current);
  const archived = readArchive(file);
  if (!archived.length) return { ...working, archived: 0 };
  // An interrupted append can leave an entry in the archive and in the working file.
  const seen = new Set();
  const all = [];
  for (const entry of [...archived, ...current]) {
    const key = isRecord(entry) && typeof entry.hash === "string" ? entry.hash : null;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    all.push(entry);
  }
  const whole = verifyChain(all);
  return {
    ok: working.ok && whole.ok,
    entries: current.length,
    chained: working.chained,
    legacy: working.legacy,
    brokenAt: working.brokenAt,
    reason: working.reason || (whole.ok ? null : `archive:${whole.reason}`),
    archived: archived.length,
  };
}

module.exports = {
  DEFAULT_KEEP,
  appendRecord,
  appendToArchive,
  readRecords,
  readArchive,
  archiveFileOf,
  archiveFilesOf,
  verifyChain,
  verifyRecordFile,
  hashEntry,
};
