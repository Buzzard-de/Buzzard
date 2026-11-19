/**
 * State of the JSON stores that hold accounts, sessions and the logs:
 * readable or not, entries that do not fit the expected shape, whether the
 * record chain is intact, file permissions, backup and archive. Reports
 * counts and states only, never content.
 */
const fs = require("fs");
const path = require("path");
const { getDataDirInfo } = require("./dataDir");
const { inspectJsonFile } = require("./jsonFileStore");
const { verifyRecordFile, archiveFilesOf } = require("./recordStore");
const { PERMISSIONS } = require("./rbac");

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isText = (value, max = 500) => typeof value === "string" && value.length > 0 && value.length <= max;
const isTime = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));

const STORES = {
  "admin-users.json": {
    kind: "accounts",
    container: Array.isArray,
    entry: (e) =>
      isObject(e) &&
      isText(e.id, 120) &&
      isText(e.email, 254) &&
      /^[^\s@]+@[^\s@]+$/.test(e.email) &&
      isText(e.password_hash, 1000) &&
      isText(e.role, 40) &&
      Object.prototype.hasOwnProperty.call(PERMISSIONS, e.role) &&
      !("password" in e),
  },
  "admin-sessions.json": {
    kind: "sessions",
    container: Array.isArray,
    entry: (e) =>
      isObject(e) &&
      typeof e.tokenHash === "string" &&
      /^[0-9a-f]{64}$/.test(e.tokenHash) &&
      !("token" in e) &&
      isObject(e.session) &&
      isText(e.session.userId, 120) &&
      isText(e.session.role, 40) &&
      Number.isFinite(e.session.expiresAt),
  },
  "audit-log.json": {
    kind: "records",
    container: Array.isArray,
    entry: (e) => isObject(e) && isText(e.id, 120) && isText(e.action, 200) && isTime(e.timestamp),
  },
  "security-log.json": {
    kind: "records",
    container: Array.isArray,
    entry: (e) => isObject(e) && isText(e.id, 120) && isText(e.type, 120) && isTime(e.timestamp),
  },
  "automation-events.json": {
    kind: "records",
    container: Array.isArray,
    entry: (e) =>
      isObject(e) &&
      isText(e.id, 120) &&
      isText(e.type, 120) &&
      isTime(e.createdAt) &&
      e.sent !== true &&
      e.executed !== true &&
      e.providerCalled !== true,
  },
  "admin-2fa.json": {
    kind: "second-factor",
    container: isObject,
    entry: (e) => isObject(e) && typeof e.enabled === "boolean",
  },
};

function fileMode(file) {
  try {
    return (fs.statSync(file).mode & 0o777).toString(8).padStart(3, "0");
  } catch {
    return null;
  }
}

function corruptCopies(file) {
  const base = `${path.basename(file)}.corrupt-`;
  try {
    return fs.readdirSync(path.dirname(file)).filter((name) => name.startsWith(base)).length;
  } catch {
    return 0;
  }
}

/** Shape check of one store's parsed content. */
function validateStore(name, value) {
  const schema = STORES[name];
  if (!schema) return { ok: false, reason: "unknown_store" };
  if (!schema.container(value)) return { ok: false, reason: "wrong_container", entries: 0, invalidEntries: 0 };
  const entries = Array.isArray(value) ? value : Object.values(value);
  const invalidEntries = entries.filter((entry) => !schema.entry(entry)).length;
  return { ok: invalidEntries === 0, entries: entries.length, invalidEntries };
}

function describeStore(dir, name) {
  const schema = STORES[name];
  const file = path.join(dir, name);
  const store = inspectJsonFile(file, { validate: schema.container });
  const report = {
    store: name,
    kind: schema.kind,
    state: store.state,
    entries: 0,
    invalidEntries: 0,
    mode: fileMode(file),
    worldReadable: null,
    backup: fs.existsSync(`${file}.bak`),
    corruptCopies: corruptCopies(file),
  };
  if (report.mode !== null) report.worldReadable = (parseInt(report.mode, 8) & 0o004) !== 0;
  if (store.state === "ok" || store.state === "restored") {
    const shape = validateStore(name, store.value);
    report.entries = shape.entries;
    report.invalidEntries = shape.invalidEntries;
  }
  if (schema.kind === "records") {
    const chain = verifyRecordFile(file);
    report.chain = { ok: chain.ok, chained: chain.chained, legacy: chain.legacy, brokenAt: chain.brokenAt, reason: chain.reason };
    report.archived = chain.archived;
    report.archiveFiles = archiveFilesOf(file).length;
  }
  report.healthy =
    store.state !== "corrupt" &&
    store.state !== "restored" &&
    report.invalidEntries === 0 &&
    (report.chain ? report.chain.ok : true);
  return report;
}

function describeStores() {
  const info = getDataDirInfo();
  const stores = Object.keys(STORES).map((name) => describeStore(info.path, name));
  return {
    healthy: stores.every((store) => store.healthy),
    location: { mode: info.mode, isolated: info.isolated === true },
    stores,
  };
}

module.exports = { STORES, validateStore, describeStore, describeStores };
