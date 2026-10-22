const { IMPORT_JOB_STATUS, ERROR_CLASS, RELATION_KIND } = require("../constants");
const kit = require("../../machineryDomainKit");
const { upsertMachine } = require("../machines");
const { upsertPart, addPartRelation } = require("../parts");
const { addEvidence } = require("../compatibility");

function createImportJobs(store, { taxonomy, observability }) {
  async function runImport({ connector, payload } = {}) {
    const job = {
      id: `ame-job-${store.jobs.size + 1}`,
      connectorId: connector?.id || "unknown",
      domain: "agricultural",
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
    observability.record("import.attempt", { domain: "agricultural" });

    const sizeCheck = kit.security.assertPayloadSize(payload || {});
    if (!sizeCheck.ok) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push(sizeCheck);
      job.finishedAt = kit.nowIso();
      return job;
    }

    let fetched;
    try {
      fetched = payload?.records ? { ok: true, records: payload.records, mock: true } : await connector.fetchCatalog();
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
      [records.machines, records.parts, records.evidence, records.offers, records.documents, records.relations]
        .filter(Array.isArray)
        .flat()
    );
    if (!limit.ok) {
      job.status = IMPORT_JOB_STATUS.FAILED;
      job.errors.push(limit);
      job.finishedAt = kit.nowIso();
      return job;
    }

    const providerId = connector.id;
    const sourceMap = new Map();

    for (const raw of records.machines || []) {
      const result = upsertMachine(store, { ...raw, providerId, mock: true, source: providerId }, taxonomy);
      if (!result.ok) {
        job.rejected += 1;
        store.failedRecords.set(`${job.id}:machine:${raw.sourceRecordId}`, result);
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
        continue;
      }
      sourceMap.set(`machine:${raw.sourceRecordId}`, result.machine.id);
      if (result.created) job.imported += 1;
      else job.updated += 1;
    }

    for (const raw of records.parts || []) {
      const safe = kit.security.sanitizeText(raw.description || raw.oemPartNumber || "");
      if (!safe.ok) {
        job.rejected += 1;
        job.errors.push({ record: raw.sourceRecordId, ...safe });
        continue;
      }
      const result = upsertPart(store, { ...raw, providerId, mock: true, source: providerId });
      if (!result.ok) {
        job.rejected += 1;
        store.failedRecords.set(`${job.id}:part:${raw.sourceRecordId}`, result);
        job.errors.push({ record: raw.sourceRecordId, issues: result.issues, class: ERROR_CLASS.VALIDATION });
        continue;
      }
      sourceMap.set(`part:${raw.sourceRecordId}`, result.part.id);
      if (result.created) job.imported += 1;
      else job.updated += 1;
    }

    for (const raw of records.relations || []) {
      const result = addPartRelation(store, {
        fromPartId: sourceMap.get(`part:${raw.fromSourceRecordId}`),
        toPartId: sourceMap.get(`part:${raw.toSourceRecordId}`),
        kind: raw.kind || RELATION_KIND.SUPERSESSION,
        providerId,
      });
      if (!result.ok) {
        job.rejected += 1;
        job.errors.push({ issues: result.issues, class: ERROR_CLASS.VALIDATION });
      }
    }

    for (const raw of records.evidence || []) {
      const existing = raw.sourceRecordId
        ? [...store.evidence.values()].find(
            (row) => row.provenance.sourceRecordId === raw.sourceRecordId && row.provenance.providerId === providerId
          )
        : null;
      if (existing) {
        job.updated += 1;
        continue;
      }
      const result = addEvidence(store, {
        ...raw,
        partId: sourceMap.get(`part:${raw.partSourceRecordId}`) || kit.lookupSource(store, "part", providerId, raw.partSourceRecordId),
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
      store.suppliers.set(raw.id, { ...raw, provenance: kit.createProvenance({ providerId, sourceRecordId: raw.id, mock: true }) });
    }
    for (const raw of records.warehouses || []) {
      store.warehouses.set(raw.id, { ...raw, provenance: kit.createProvenance({ providerId, sourceRecordId: raw.id, mock: true }) });
    }
    for (const raw of records.offers || []) {
      const partId = sourceMap.get(`part:${raw.partSourceRecordId}`);
      if (!partId) {
        job.rejected += 1;
        continue;
      }
      const existing = [...store.offers.values()].find((row) => row.sourceRecordId === raw.sourceRecordId && row.providerId === providerId);
      const offer = {
        ...raw,
        partId,
        providerId,
        inventoryTrust: "SUPPLIER_REPORTED",
        provenance: kit.createProvenance({ providerId, sourceRecordId: raw.sourceRecordId, mock: true, freshnessAt: raw.observedAt }),
      };
      if (existing) {
        store.offers.set(existing.id, { ...existing, ...offer, id: existing.id });
        job.updated += 1;
      } else {
        const id = `ame-offer-${store.offers.size + 1}`;
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
        provenance: kit.createProvenance({ providerId, sourceRecordId: raw.sourceRecordId, mock: true }),
      });
      job.imported += 1;
    }

    job.status = job.errors.length ? IMPORT_JOB_STATUS.PARTIAL : IMPORT_JOB_STATUS.SUCCEEDED;
    job.finishedAt = kit.nowIso();
    observability.record("import.finish", { status: job.status, domain: "agricultural" });
    return job;
  }

  return {
    runImport,
    getJob: (id) => store.jobs.get(id) || null,
    listJobs: () => [...store.jobs.values()],
  };
}

module.exports = { createImportJobs };
