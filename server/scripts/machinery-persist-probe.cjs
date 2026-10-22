#!/usr/bin/env node
/**
 * Process-B reader for machinery persist tests. Opens a temp SQLite file only.
 */
const Database = require("better-sqlite3");
const { createMachineryRepository } = require("../lib/machineryDomainKit/persistence");

const dbPath = process.argv[2];
const domain = process.argv[3] || "automotive";
if (!dbPath) {
  process.stderr.write("usage: machinery-persist-probe.cjs <dbPath> [domain]\n");
  process.exit(2);
}

const db = new Database(dbPath);
const repo = createMachineryRepository({ domain, db });
const parts = repo.listParts();
process.stdout.write(JSON.stringify({ count: parts.length, id: parts[0] ? parts[0].id : null }));
db.close();
