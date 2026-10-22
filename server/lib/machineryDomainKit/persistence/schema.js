/**
 * Isolated specialist-engine tables inside the existing buzzard.db file.
 * Does not create or alter shop tables (users, products, vehicles, compatibility, …).
 *
 * Flag: BUZZARD_MACHINERY_PERSIST
 *   unset + getEngine() outside tests → persist on (uses resolveDbPath / shared db)
 *   "0" → persist off
 *   "1" → persist on
 * create*Engine() stays in-memory unless { persist: true }.
 */

const SCHEMA_VERSION = 1;

const DOMAIN_TABLES = Object.freeze({
  automotive: Object.freeze({
    prefix: "vpe",
    hosts: "vpe_vehicles",
    parts: "vpe_parts",
    evidence: "vpe_evidence",
    offers: "vpe_offers",
    hostKind: "vehicle",
  }),
  agricultural: Object.freeze({
    prefix: "ame",
    hosts: "ame_machines",
    parts: "ame_parts",
    evidence: "ame_evidence",
    offers: "ame_offers",
    hostKind: "machine",
  }),
  construction: Object.freeze({
    prefix: "cme",
    hosts: "cme_machines",
    parts: "cme_parts",
    evidence: "cme_evidence",
    offers: "cme_offers",
    hostKind: "machine",
  }),
});

const OWNED_TABLES = Object.freeze(
  Object.values(DOMAIN_TABLES).flatMap((spec) => [spec.hosts, spec.parts, spec.evidence, spec.offers])
);

function hostTableSql(name, domain) {
  return `
CREATE TABLE IF NOT EXISTS ${name} (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain = '${domain}'),
  catalog_source TEXT NOT NULL CHECK (catalog_source IN ('mock','licensed','supplier','manual')),
  provider_id TEXT,
  source_record_id TEXT,
  category_id TEXT,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_${name}_provider ON ${name}(provider_id, source_record_id);
CREATE INDEX IF NOT EXISTS idx_${name}_category ON ${name}(category_id);
`;
}

function partTableSql(name, domain) {
  return `
CREATE TABLE IF NOT EXISTS ${name} (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain = '${domain}'),
  catalog_source TEXT NOT NULL CHECK (catalog_source IN ('mock','licensed','supplier','manual')),
  provider_id TEXT,
  source_record_id TEXT,
  category_id TEXT,
  oem_normalized TEXT,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_${name}_oem ON ${name}(oem_normalized);
CREATE INDEX IF NOT EXISTS idx_${name}_provider ON ${name}(provider_id, source_record_id);
CREATE INDEX IF NOT EXISTS idx_${name}_category ON ${name}(category_id);
`;
}

function childTableSql(name, domain) {
  return `
CREATE TABLE IF NOT EXISTS ${name} (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain = '${domain}'),
  catalog_source TEXT NOT NULL CHECK (catalog_source IN ('mock','licensed','supplier','manual')),
  provider_id TEXT,
  source_record_id TEXT,
  part_id TEXT,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_${name}_part ON ${name}(part_id);
`;
}

function ensureMachineryTables(db) {
  if (!db || typeof db.exec !== "function") {
    throw new Error("ensureMachineryTables requires a better-sqlite3 database");
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS machinery_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
${hostTableSql("vpe_vehicles", "automotive")}
${partTableSql("vpe_parts", "automotive")}
${childTableSql("vpe_evidence", "automotive")}
${childTableSql("vpe_offers", "automotive")}
${hostTableSql("ame_machines", "agricultural")}
${partTableSql("ame_parts", "agricultural")}
${childTableSql("ame_evidence", "agricultural")}
${childTableSql("ame_offers", "agricultural")}
${hostTableSql("cme_machines", "construction")}
${partTableSql("cme_parts", "construction")}
${childTableSql("cme_evidence", "construction")}
${childTableSql("cme_offers", "construction")}
`);
  const existing = db.prepare("SELECT value FROM machinery_meta WHERE key = ?").get("schema_version");
  if (!existing) {
    db.prepare("INSERT INTO machinery_meta (key, value) VALUES (?, ?)").run("schema_version", String(SCHEMA_VERSION));
  }
  return {
    ok: true,
    schemaVersion: Number(existing?.value || SCHEMA_VERSION),
    tables: OWNED_TABLES,
  };
}

function tablesForDomain(domain) {
  const spec = DOMAIN_TABLES[domain];
  if (!spec) return null;
  return spec;
}

function isOwnedTable(name) {
  return OWNED_TABLES.includes(String(name || ""));
}

function listMachineryTableNames(db) {
  const rows = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE 'vpe_%' OR name LIKE 'ame_%' OR name LIKE 'cme_%' OR name = 'machinery_meta') ORDER BY name"
    )
    .all();
  return rows.map((row) => row.name);
}

module.exports = {
  SCHEMA_VERSION,
  DOMAIN_TABLES,
  OWNED_TABLES,
  ensureMachineryTables,
  tablesForDomain,
  isOwnedTable,
  listMachineryTableNames,
};
