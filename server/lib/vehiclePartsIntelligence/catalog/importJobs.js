const { IMPORT_JOB_STATUS, ERROR_CLASS, RELATION_KIND } = require("../constants");
const kit = require("../../machineryDomainKit");
const { upsertVehicle } = require("../vehicles");
const { upsertPart, addPartRelation } = require("../parts");
const { addEvidence } = require("../compatibility");

function createImportJobs(store, { taxonomy, observability }) {
  async function runImport({ connector, payload } = {}) {
    const job = {
      id: `vpe-job-${store.jobs.size + 1}`,
      connectorId: connector?.id || "unknown",
      domain: "automotive",
      status: IMPORT_JOB_STATUS.RUNNING,
      startedAt: kit.nowIso(),
      imported: 0,
      updated: 0,
      rejected: 0,
      errors: [],
      mock: Boolean(connector?.mock),
      didDeleteMissing: false,
    };
    store.jobs.set(job.id, job);
    const size = kit.security.assertPayloadSize(payload || {});
    if (!size.ok) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push(size);
      job.finishedAt = kit.nowIso();
      return job;
    }
    let fetched;
    try {
      fetched = payload?.records ? { ok: true, records: payload.records } : await connector.fetchCatalog();
    } catch (error) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push({ error: error.message, class: error.retryable ? ERROR_CLASS.RETRYABLE : ERROR_CLASS.NON_RETRYABLE });
      job.finishedAt = kit.nowIso();
      return job;
    }
    if (!fetched?.ok || !fetched.records) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push({ error: fetched?.reason || "empty_fetch", class: ERROR_CLASS.NON_RETRYABLE });
      job.finishedAt = kit.nowIso();
      return job;
    }
    const records = fetched.records;
    const limit = kit.security.assertRecordLimit(
      [records.vehicles, records.parts, records.evidence, records.offers].filter(Array.isArray).flat()
    );
    if (!limit.ok) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push(limit);
      job.finishedAt = kit.nowIso();
      return job;
    }
    const providerId = connector.id;
    const map = new Map();
    for (const raw of records.vehicles || []) {
      const result = upsertVehicle(store, { ...raw, providerId, source: providerId, mock: true });
      if (!result.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
        continue;
      }
      map.set(`vehicle:${raw.sourceRecordId}`, result.vehicle.id);
      result.created ? (job.imported += 1) : (job.updated += 1);
    }
    for (const raw of records.parts || []) {
      const safe = kit.security.sanitizeText(raw.description || raw.oemPartNumber || "");
      if (!safe.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.sourceRecordId, ...safe });
        continue;
      }
      const result = upsertPart(store, { ...raw, providerId, source: providerId, mock: true });
      if (!result.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
        continue;
      }
      map.set(`part:${raw.sourceRecordId}`, result.part.id);
      result.created ? (job.imported += 1) : (job.updated += 1);
    }
    for (const raw of records.relations || []) {
      addPartRelation(store, {
        fromPartId: map.get(`part:${raw.fromSourceRecordId}`),
        toPartId: map.get(`part:${raw.toSourceRecordId}`),
        kind: raw.kind || RELATION_KIND.APPROVED_ALTERNATIVE,
        providerId,
      });
    }
    for (const raw of records.evidence || []) {
      const existing = raw.sourceRecordId
        ? [...store.evidence.values()].find((row) => row.provenance.sourceRecordId === raw.sourceRecordId)
        : null;
      if (existing) {
        job.updated += 1;
        continue;
      }
      const result = addEvidence(store, {
        ...raw,
        partId: map.get(`part:${raw.partSourceRecordId}`),
        providerId,
        source: providerId,
        sourceRecordId: raw.sourceRecordId,
        mock: true,
      });
      if (!result.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
      } else job.imported += 1;
    }
    for (const raw of records.suppliers || []) store.suppliers.set(raw.id, raw);
    for (const raw of records.warehouses || []) store.warehouses.set(raw.id, raw);
    for (const raw of records.offers || []) {
      const partId = map.get(`part:${raw.partSourceRecordId}`);
      if (!partId) {
        job.rejected += 1;
        continue;
      }
      const existing = [...store.offers.values()].find((row) => row.sourceRecordId === raw.sourceRecordId);
      const offer = { ...raw, partId, providerId, provenance: kit.createProvenance({ providerId, sourceRecordId: raw.sourceRecordId, mock: true, freshnessAt: raw.observedAt }) };
      if (existing) {
        store.offers.set(existing.id, { ...existing, ...offer, id: existing.id });
        job.updated += 1;
      } else {
        store.offers.set(`vpe-offer-${store.offers.size + 1}`, { ...offer, id: `vpe-offer-${store.offers.size + 1}` });
        job.imported += 1;
      }
    }
    for (const raw of records.documents || []) {
      if (!store.documents.has(raw.sourceRecordId)) {
        store.documents.set(raw.sourceRecordId, { ...raw, structured: false });
        job.imported += 1;
      } else job.updated += 1;
    }
    job.status = job.errors.length ? IMPORT_JOB_STATUS.PARTIAL : IMPORT_JOB_STATUS.SUCCEEDED;
    job.finishedAt = kit.nowIso();
    observability.record("import.finish", { status: job.status, domain: "automotive" });
    return job;
  }
  return { runImport, getJob: (id) => store.jobs.get(id) || null, listJobs: () => [...store.jobs.values()] };
}

module.exports = { createImportJobs };
