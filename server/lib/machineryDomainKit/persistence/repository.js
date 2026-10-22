const isolation = require("../isolation");
const { ensureMachineryTables, tablesForDomain, isOwnedTable } = require("./schema");
const { inferCatalogSource, sanitizeRecord, payloadHasFullVin } = require("./sanitize");

function nowIso() {
  return new Date().toISOString();
}

function assertPersistOwnership(domain, record = {}) {
  return isolation.assertPersistOwnership(domain, record);
}

function parseRow(row) {
  if (!row) return null;
  try {
    return JSON.parse(row.payload_json);
  } catch {
    return null;
  }
}

function createMachineryRepository({ domain, db } = {}) {
  const tables = tablesForDomain(domain);
  if (!tables || !db) {
    throw new Error("createMachineryRepository requires a valid domain and sqlite database");
  }
  ensureMachineryTables(db);

  const owned = new Set([tables.hosts, tables.parts, tables.evidence, tables.offers]);

  function rejectCross(table) {
    return {
      ok: false,
      error: "cross_domain_forbidden",
      table,
      domain,
      items: [],
      records: [],
    };
  }

  function assertTable(table) {
    if (!owned.has(table) || !isOwnedTable(table)) return rejectCross(table);
    return { ok: true };
  }

  function writeRow(table, kind, record) {
    const ownership = assertPersistOwnership(domain, record || {});
    if (!ownership.ok) return ownership;
    const tableCheck = assertTable(table);
    if (!tableCheck.ok) return tableCheck;

    const incomingSource = inferCatalogSource(record);
    const existing = db.prepare(`SELECT catalog_source, payload_json FROM ${table} WHERE id = ?`).get(record.id);
    if (existing && incomingSource === "mock" && existing.catalog_source !== "mock") {
      return { ok: false, error: "mock_overwrite_blocked", id: record.id, catalogSource: existing.catalog_source };
    }

    const cleaned = sanitizeRecord(record, domain);
    if (!cleaned.id) return { ok: false, error: "missing_id" };
    if (payloadHasFullVin(cleaned)) return { ok: false, error: "full_vin_forbidden" };

    const providerId = cleaned.provenance?.providerId || cleaned.providerId || null;
    const sourceRecordId = cleaned.provenance?.sourceRecordId || cleaned.sourceRecordId || null;
    const updatedAt = cleaned.updatedAt || nowIso();
    const payload = JSON.stringify(cleaned);

    if (table === tables.parts) {
      db.prepare(
        `INSERT INTO ${table} (id, domain, catalog_source, provider_id, source_record_id, category_id, oem_normalized, payload_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           catalog_source = excluded.catalog_source,
           provider_id = excluded.provider_id,
           source_record_id = excluded.source_record_id,
           category_id = excluded.category_id,
           oem_normalized = excluded.oem_normalized,
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`
      ).run(
        cleaned.id,
        domain,
        cleaned.catalogSource,
        providerId,
        sourceRecordId,
        cleaned.categoryId || null,
        cleaned.oemNormalized || null,
        payload,
        updatedAt
      );
    } else if (table === tables.hosts) {
      db.prepare(
        `INSERT INTO ${table} (id, domain, catalog_source, provider_id, source_record_id, category_id, payload_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           catalog_source = excluded.catalog_source,
           provider_id = excluded.provider_id,
           source_record_id = excluded.source_record_id,
           category_id = excluded.category_id,
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`
      ).run(
        cleaned.id,
        domain,
        cleaned.catalogSource,
        providerId,
        sourceRecordId,
        cleaned.categoryId || null,
        payload,
        updatedAt
      );
    } else {
      db.prepare(
        `INSERT INTO ${table} (id, domain, catalog_source, provider_id, source_record_id, part_id, payload_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           catalog_source = excluded.catalog_source,
           provider_id = excluded.provider_id,
           source_record_id = excluded.source_record_id,
           part_id = excluded.part_id,
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at`
      ).run(
        cleaned.id,
        domain,
        cleaned.catalogSource,
        providerId,
        sourceRecordId,
        cleaned.partId || null,
        payload,
        updatedAt
      );
    }
    return { ok: true, record: cleaned, kind };
  }

  function listTable(table) {
    const check = assertTable(table);
    if (!check.ok) return [];
    return db
      .prepare(`SELECT payload_json FROM ${table} WHERE domain = ?`)
      .all(domain)
      .map(parseRow)
      .filter(Boolean);
  }

  function getById(table, id) {
    const check = assertTable(table);
    if (!check.ok) return null;
    return parseRow(db.prepare(`SELECT payload_json FROM ${table} WHERE id = ? AND domain = ?`).get(id, domain));
  }

  return {
    domain,
    tables,
    assertPersistOwnership: (record) => assertPersistOwnership(domain, record),
    upsertHost: (record) => writeRow(tables.hosts, tables.hostKind, record),
    upsertPart: (record) => writeRow(tables.parts, "part", record),
    upsertEvidence: (record) => writeRow(tables.evidence, "evidence", record),
    upsertOffer: (record) => writeRow(tables.offers, "offer", record),
    getHost: (id) => getById(tables.hosts, id),
    getPart: (id) => getById(tables.parts, id),
    getEvidence: (id) => getById(tables.evidence, id),
    getOffer: (id) => getById(tables.offers, id),
    listHosts: () => listTable(tables.hosts),
    listParts: () => listTable(tables.parts),
    listEvidence: () => listTable(tables.evidence),
    listOffers: () => listTable(tables.offers),
    loadAll() {
      return {
        hosts: this.listHosts(),
        parts: this.listParts(),
        evidence: this.listEvidence(),
        offers: this.listOffers(),
      };
    },
    readTable(table) {
      if (!owned.has(table)) return rejectCross(table);
      return { ok: true, items: listTable(table) };
    },
    writeTable(table, record) {
      if (!owned.has(table)) return rejectCross(table);
      if (table === tables.hosts) return writeRow(table, tables.hostKind, record);
      if (table === tables.parts) return writeRow(table, "part", record);
      if (table === tables.evidence) return writeRow(table, "evidence", record);
      if (table === tables.offers) return writeRow(table, "offer", record);
      return rejectCross(table);
    },
  };
}

module.exports = {
  createMachineryRepository,
  assertPersistOwnership,
};
