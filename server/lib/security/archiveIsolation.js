/**
 * Archived network code must not be a production entry point.
 */
const fs = require("fs");
const path = require("path");

const ARCHIVE_REL = "intelligence/archive/buzzard_production_bridge_max_single.py";

function productionEntryPoints({ root = process.cwd() } = {}) {
  return [
    path.join(root, "server/server.js"),
    path.join(root, "server/lib/pusat/runtime.js"),
    path.join(root, "intelligence/security/guarded_fetch.py"),
  ];
}

function assertArchiveNotImported({ root = process.cwd() } = {}) {
  const archiveAbs = path.join(root, ARCHIVE_REL);
  const hits = [];
  for (const file of productionEntryPoints({ root })) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (text.includes("buzzard_production_bridge_max_single") || text.includes("intelligence/archive/")) {
      hits.push(path.relative(root, file));
    }
  }
  const archiveText = fs.existsSync(archiveAbs) ? fs.readFileSync(archiveAbs, "utf8") : "";
  return {
    ok: hits.length === 0,
    hits,
    archiveCheckUrlIsolated: archiveText.includes("ARCHIVE_NOT_EXECUTABLE"),
    productionEntry: false,
  };
}

module.exports = { assertArchiveNotImported, ARCHIVE_REL };
