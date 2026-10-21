const { IMPORT_JOB_STATUS, ERROR_CLASS, RELATION_KIND } = require("../constants");
const { upsertMachine } = require("../machines");
const { upsertPart, addPartRelation } = require("../parts");
const { addEvidence } = require("../compatibility");
const { createProvenance } = require("../provenance");
const { appendAudit, nowIso, lookupSource } = require("../store");
const { assertPayloadSize, assertRecordLimit, sanitizeText } = require("./security");

function lookupExistingPart(store, raw, providerId) {
  if (!raw.partSourceRecordId) return null;
  return lookupSource(store, "part", providerId, raw.partSourceRecordId);
}

function createImportJobs(store, { taxonomy, observability }) {
  function persistJob(job) {
    store.jobs.set(job.id, job);
    return job;
  }

  async function runImport({ connector, mode = "full", payload } = {}) {
    const job = persistJob({
      id: `cme-job-${store.jobs.size + 1}`,
      connectorId: connector?.id || "unknown",
      mode,
      status: IMPORT_JOB_STATUS.RUNNING,
      startedAt: nowIso(),
      imported: 0,
      updated: 0,
      rejected: 0,
      conflicts: 0,
      errors: [],
      mock: Boolean(connector?.mock),
    });

    observability.record("import.attempt", { connectorId: job.connectorId });

    const sizeCheck = assertPayloadSize(payload || {});
    if (!sizeCheck.ok) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push(sizeCheck);
      job.finishedAt = nowIso();
      return job;
    }

    let fetched;
    try {
      fetched = payload?.records ? { ok: true, records: payload.records, mock: true } : await connector.fetchCatalog({ mode });
    } catch (error) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push({
        error: error.message,
        class: error.retryable ? ERROR_CLASS.RETRYABLE : ERROR_CLASS.NON_RETRYABLE,
      });
      job.finishedAt = nowIso();
      observability.record("import.provider_error", { connectorId: job.connectorId });
      return job;
    }

    if (!fetched?.ok || !fetched.records) {
      job.status = fetched?.status === "NOT_CONFIGURED" ? IMPORT_JOB_STATUS.FAILED : IMPORT_JOB_STATUS.FAILED;
      job.errors.push({ error: fetched?.reason || "empty_fetch", class: ERROR_CLASS.NON_RETRYABLE });
      job.finishedAt = nowIso();
      return job;
    }

    const records = fetched.records;
    const bags = [
      records.machines,
      records.parts,
      records.evidence,
      records.offers,
      records.documents,
      records.relations,
    ].filter(Array.isArray);
    const limit = assertRecordLimit(bags.flat());
    if (!limit.ok) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push(limit);
      job.finishedAt = nowIso();
      return job;
    }

    const providerId = connector.id;
    const sourceMap = new Map();

    for (const raw of records.machines || []) {
      const result = upsertMachine(
        store,
        { ...raw, providerId, mock: true, source: providerId },
        taxonomy
      );
      if (!result.ok) {
        job.rejected += 1;
        store.failedRecords.set(`${job.id}:machine:${raw.sourceRecordId || "unknown"}`, result);
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
        continue;
      }
      sourceMap.set(`machine:${raw.sourceRecordId}`, result.machine.id);
      if (result.created) job.imported += 1;
      else job.updated += 1;
    }

    for (const raw of records.parts || []) {
      const nameCheck = sanitizeText(raw.description || raw.oemPartNumber || "");
      if (!nameCheck.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.sourceRecordId, ...nameCheck });
        continue;
      }
      const result = upsertPart(store, { ...raw, providerId, mock: true, source: providerId });
      if (!result.ok) {
        job.rejected += 1;
        store.failedRecords.set(`${job.id}:part:${raw.sourceRecordId || "unknown"}`, result);
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
        continue;
      }
      sourceMap.set(`part:${raw.sourceRecordId}`, result.part.id);
      if (result.created) job.imported += 1;
      else job.updated += 1;
    }

    for (const raw of records.relations || []) {
      const fromPartId = sourceMap.get(`part:${raw.fromSourceRecordId}`);
      const toPartId = sourceMap.get(`part:${raw.toSourceRecordId}`);
      const result = addPartRelation(store, {
        fromPartId,
        toPartId,
        kind: raw.kind || RELATION_KIND.SUPERSESSION,
        providerId,
      });
      if (!result.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.fromSourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
      }
    }

    for (const raw of records.evidence || []) {
      const partId = sourceMap.get(`part:${raw.partSourceRecordId}`) || lookupExistingPart(store, raw, providerId);
      const existingEvidence = raw.sourceRecordId
        ? [...store.evidence.values()].find(
            (row) => row.provenance.sourceRecordId === raw.sourceRecordId && row.provenance.providerId === providerId
          )
        : null;
      if (existingEvidence) {
        job.updated += 1;
        continue;
      }
      const result = addEvidence(store, {
        ...raw,
        partId,
        providerId,
        source: providerId,
        sourceRecordId: raw.sourceRecordId,
        mock: true,
      });
      if (!result.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
        continue;
      }
      job.imported += 1;
    }

    for (const raw of records.suppliers || []) {
      store.suppliers.set(raw.id, { ...raw, provenance: createProvenance({ providerId, sourceRecordId: raw.id, mock: true }) });
    }
    for (const raw of records.warehouses || []) {
      store.warehouses.set(raw.id, { ...raw, provenance: createProvenance({ providerId, sourceRecordId: raw.id, mock: true }) });
    }
    for (const raw of records.offers || []) {
      const partId = sourceMap.get(`part:${raw.partSourceRecordId}`);
      if (!partId) {
        job.rejected += 1;
        continue;
      }
      const offer = {
        ...raw,
        partId,
        providerId,
        inventoryTrust: "SUPPLIER_REPORTED",
        provenance: createProvenance({ providerId, sourceRecordId: raw.sourceRecordId, mock: true, freshnessAt: raw.observedAt }),
      };
      const existing = [...store.offers.values()].find((row) => row.sourceRecordId === raw.sourceRecordId && row.providerId === providerId);
      if (existing) {
        store.offers.set(existing.id, { ...existing, ...offer, id: existing.id });
        job.updated += 1;
      } else {
        const id = `offer-${store.offers.size + 1}`;
        store.offers.set(id, { ...offer, id });
        job.imported += 1;
      }
    }

    for (const raw of records.documents || []) {
      if (store.documents.has(raw.sourceRecordId)) {
        job.updated += 1;
        continue;
      }
      store.documents.set(raw.sourceRecordId, {
        ...raw,
        structured: false,
        provenance: createProvenance({ providerId, sourceRecordId: raw.sourceRecordId, mock: true }),
      });
      job.imported += 1;
    }

    job.conflicts = store.conflicts.size;
    job.status = job.errors.length ? IMPORT_JOB_STATUS.PARTIAL : IMPORT_JOB_STATUS.SUCCEEDED;
    job.finishedAt = nowIso();
    job.didDeleteMissing = false;
    appendAudit(store, { action: "import.finish", jobId: job.id, status: job.status });
    observability.record("import.finish", { status: job.status, imported: job.imported, rejected: job.rejected });
    return job;
  }

  function getJob(id) {
    return store.jobs.get(id) || null;
  }

  function listJobs() {
    return [...store.jobs.values()];
  }

  return { runImport, getJob, listJobs };
}

module.exports = { createImportJobs };
