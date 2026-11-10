const { QUALITY_STATUS } = require("./constants");
const { stableId } = require("./identifiers");
const { createProvenance, recordConflict } = require("./provenance");
const { lookupSource, rememberSource, appendAudit, nowIso } = require("./store");

function validateMachineInput(input = {}, taxonomy) {
  const issues = [];
  const manufacturer = String(input.manufacturer || input.brand || "").trim();
  const modelName = String(input.modelName || input.model || "").trim();
  const modelCode = String(input.modelCode || input.exactModelCode || "").trim();
  if (!manufacturer) issues.push("missing_manufacturer");
  if (!modelName && !modelCode) issues.push("missing_model");
  if (input.categoryId && taxonomy && !taxonomy.get(input.categoryId)) {
    issues.push("unknown_category");
  }
  if (input.yearFrom && input.yearTo && Number(input.yearFrom) > Number(input.yearTo)) {
    issues.push("invalid_year_range");
  }
  if (input.serialFrom && input.serialTo && String(input.serialFrom) > String(input.serialTo)) {
    issues.push("invalid_serial_range");
  }
  return { ok: issues.length === 0, issues, manufacturer, modelName, modelCode };
}

function normalizeMachine(input, taxonomy) {
  const checked = validateMachineInput(input, taxonomy);
  const providerId = input.providerId || input.source || "manual";
  const sourceRecordId = input.sourceRecordId || input.sourceId || null;
  const id =
    input.id ||
    (sourceRecordId
      ? stableId("cme-machine", [providerId, sourceRecordId])
      : stableId("cme-machine", [checked.manufacturer, checked.modelCode || checked.modelName, input.generation || ""]));

  return {
    checked,
    machine: {
      id,
      manufacturer: checked.manufacturer,
      brand: String(input.brand || checked.manufacturer).trim(),
      family: String(input.family || input.machineFamily || "").trim() || null,
      categoryId: input.categoryId || null,
      modelName: checked.modelName || checked.modelCode,
      modelCode: checked.modelCode || null,
      generation: String(input.generation || input.series || "").trim() || null,
      yearFrom: input.yearFrom ?? input.productionYear ?? null,
      yearTo: input.yearTo ?? null,
      productionDate: input.productionDate || null,
      serialNumber: input.serialNumber || null,
      serialFrom: input.serialFrom || null,
      serialTo: input.serialTo || null,
      chassisNumber: input.chassisNumber || input.vin || null,
      engineManufacturer: input.engineManufacturer || null,
      engineModel: input.engineModel || null,
      engineSerialNumber: input.engineSerialNumber || null,
      powertrain: input.powertrain || null,
      hydraulics: input.hydraulics || null,
      transmission: input.transmission || null,
      attachments: Array.isArray(input.attachments) ? input.attachments : [],
      region: input.region || null,
      revision: input.revision || null,
      configurationNotes: input.configurationNotes || null,
      historical: Boolean(input.historical),
      quality: checked.ok ? QUALITY_STATUS.OK : QUALITY_STATUS.INVALID,
      provenance: createProvenance(input),
      createdAt: input.createdAt || nowIso(),
      updatedAt: nowIso(),
    },
  };
}

function upsertMachine(store, input, taxonomy) {
  const { checked, machine } = normalizeMachine(input, taxonomy);
  if (!checked.ok) {
    return { ok: false, issues: checked.issues };
  }

  const existingId = lookupSource(store, "machine", machine.provenance.providerId, machine.provenance.sourceRecordId);
  const targetId = existingId || machine.id;
  const previous = store.machines.get(targetId);

  if (previous && previous.manufacturer && machine.manufacturer && previous.manufacturer !== machine.manufacturer) {
    recordConflict(store, {
      entityType: "machine",
      entityId: targetId,
      field: "manufacturer",
      values: [previous.manufacturer, machine.manufacturer],
      providers: [previous.provenance.providerId, machine.provenance.providerId],
    });
    machine.quality = QUALITY_STATUS.WARNING;
  }

  const next = previous ? { ...previous, ...machine, id: targetId, createdAt: previous.createdAt } : machine;
  next.id = targetId;
  store.machines.set(targetId, next);
  if (machine.provenance.sourceRecordId) {
    rememberSource(store, "machine", machine.provenance.providerId, machine.provenance.sourceRecordId, targetId);
  }
  appendAudit(store, { action: previous ? "machine.update" : "machine.create", entityId: targetId });
  return { ok: true, machine: next, created: !previous };
}

function getMachine(store, id) {
  return store.machines.get(id) || null;
}

function listMachines(store) {
  return [...store.machines.values()];
}

module.exports = {
  validateMachineInput,
  normalizeMachine,
  upsertMachine,
  getMachine,
  listMachines,
};
