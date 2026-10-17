/**
 * Child process for cross-process SQLite memory proof.
 * Usage: node pusatMemoryChild.cjs write|read <subject> [id]
 * Requires BUZZARD_DB_PATH in the environment.
 */
const mode = process.argv[2];
const subject = process.argv[3];
const id = process.argv[4];

if (!process.env.BUZZARD_DB_PATH) {
  process.stderr.write("BUZZARD_DB_PATH required\n");
  process.exit(2);
}

const pusat = require("../../lib/pusat");
const { db } = require("../../lib/db");
pusat.initialize(db);

if (mode === "write") {
  const written = pusat.memory.writeMemory({
    kind: "verified_fact",
    subject,
    content: { marker: "process-restart", pid: process.pid },
    source: "restart-child",
  });
  if (!written.ok) {
    process.stderr.write(JSON.stringify(written) + "\n");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ ok: true, id: written.record.id, pid: process.pid }) + "\n");
  process.exit(0);
}

if (mode === "read") {
  const rows = pusat.memory.readMemory({ subject, includeExpired: true, limit: 5 });
  const match = Array.isArray(rows) ? rows.find((r) => !id || r.id === id) : null;
  process.stdout.write(
    JSON.stringify({
      ok: Boolean(match),
      id: match?.id || null,
      subject: match?.subject || null,
      content: match?.content || null,
      pid: process.pid,
    }) + "\n"
  );
  process.exit(match ? 0 : 1);
}

process.stderr.write("mode must be write|read\n");
process.exit(2);
