#!/usr/bin/env node
/**
 * Copies JSON store files from one directory to another (e.g. server/data → persistent disk).
 * SQLite is excluded — use database backup tools for buzzard.db.
 *
 *   node scripts/migrate-json-stores.mjs --from <dir> --to <dir>            # report only
 *   node scripts/migrate-json-stores.mjs --from <dir> --to <dir> --apply    # copy
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(`migrate-json-stores: ${message}`);
  process.exit(1);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const from = argument("--from");
const to = argument("--to");
const apply = process.argv.includes("--apply");
if (!from || !to) fail("usage: --from <dir> --to <dir> [--apply]");

const source = path.resolve(from);
const target = path.resolve(to);
if (source === target) fail("source and target are the same directory");
if (target.startsWith(`${source}${path.sep}`) || source.startsWith(`${target}${path.sep}`)) {
  fail("one directory lies inside the other");
}
if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) fail("source directory does not exist");

const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function reasonToSkip(name, stat) {
  if (stat.isDirectory()) return "directory (copy separately if it holds data)";
  if (!stat.isFile()) return "not a regular file";
  if (/\.(db|sqlite|sqlite3)(-wal|-shm|-journal)?$/.test(name)) {
    return "database (located by BUZZARD_DB_PATH, back it up with the database tools)";
  }
  if (name.endsWith(".lock") || /\.lock\.\d+\./.test(name)) return "lock file";
  if (/^\..*\.tmp$/.test(name)) return "unfinished temporary file";
  if (name === "build-info.json") return "build artefact, read from the installation directory";
  if (name === ".gitkeep" || name === ".gitignore") return "repository file";
  if (/^migration-.*\.manifest\.json$/.test(name)) return "manifest of an earlier migration";
  return null;
}

const entries = fs.readdirSync(source).sort().map((name) => ({ name, stat: fs.statSync(path.join(source, name)) }));
const skipped = entries
  .map(({ name, stat }) => ({ name, reason: reasonToSkip(name, stat) }))
  .filter((entry) => entry.reason);
const names = entries.filter(({ name, stat }) => !reasonToSkip(name, stat)).map(({ name }) => name);
const locks = entries.map(({ name }) => name).filter((name) => name.endsWith(".lock"));
if (locks.length) fail(`a store is locked (${locks.join(", ")}): stop the server that uses the source directory first`);

const plan = names.map((name) => {
  const file = path.join(source, name);
  let state = "ok";
  if (name.endsWith(".json")) {
    try {
      JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      state = "unreadable";
    }
  }
  return { name, bytes: fs.statSync(file).size, sha256: sha256(file), state, existsAtTarget: fs.existsSync(path.join(target, name)) };
});

const report = { mode: apply ? "apply" : "dry-run", files: plan, notCopied: skipped, copied: 0 };
const collisions = plan.filter((entry) => entry.existsAtTarget);
const unreadable = plan.filter((entry) => entry.state === "unreadable" && /\.json$/.test(entry.name));

if (!plan.length) fail("no store files found in the source directory");
if (unreadable.length) {
  console.log(JSON.stringify(report, null, 2));
  fail(`not valid JSON: ${unreadable.map((entry) => entry.name).join(", ")} — repair or restore before migrating`);
}
if (collisions.length) {
  console.log(JSON.stringify(report, null, 2));
  fail(`target already has: ${collisions.map((entry) => entry.name).join(", ")} — nothing was copied`);
}

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  console.log("dry run: nothing was written. Add --apply to copy.");
  process.exit(0);
}

fs.mkdirSync(target, { recursive: true, mode: 0o700 });
fs.chmodSync(target, 0o700);
const written = [];
try {
  for (const entry of plan) {
    const destination = path.join(target, entry.name);
    fs.copyFileSync(path.join(source, entry.name), destination, fs.constants.COPYFILE_EXCL);
    written.push(destination);
    fs.chmodSync(destination, 0o600);
    const fd = fs.openSync(destination, "r");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    if (sha256(destination) !== entry.sha256) throw new Error(`copy of ${entry.name} differs from its source`);
    report.copied += 1;
  }
  const manifest = path.join(target, `migration-${new Date().toISOString().replace(/[-:.]/g, "")}.manifest.json`);
  fs.writeFileSync(
    manifest,
    JSON.stringify(
      { migratedAt: new Date().toISOString(), files: plan.map(({ name, bytes, sha256: hash }) => ({ name, bytes, sha256: hash })) },
      null,
      2
    ),
    { mode: 0o600, flag: "wx" }
  );
} catch (err) {
  for (const file of written) fs.rmSync(file, { force: true });
  fail(`${err.message}; the files copied by this run were removed again, the source is unchanged`);
}

console.log(JSON.stringify(report, null, 2));
console.log(`copied ${report.copied} file(s). Source left unchanged. Set BUZZARD_DATA_DIR to the target and start the server.`);