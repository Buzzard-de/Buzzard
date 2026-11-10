const { QUALITY_STATUS } = require("./constants");
const kit = require("../machineryDomainKit");

function validateMachineInput(input = {}, taxonomy) {
  const issues = [];
  const manufacturer = String(input.manufacturer || input.brand || "").trim();
  const modelName = String(input.modelName || input.model || "").trim();
  const modelCode = String(input.modelCode || input.exactModelCode || "").trim();
  if (!manufacturer) issues.push("missing_manufacturer");
  if (!modelName && !modelCode) issues.push("missing_model");
  if (input.categoryId && taxonomy && !taxonomy.get(input.categoryId)) issues.push("unknown_category");
  if (input.categoryId && String(input.categoryId).startsWith("cme-cat-")) issues.push("construction_category_rejected");
  if (input.yearFrom && input.yearTo && Number(input.yearFrom) > Number(input.yearTo)) issues.push("invalid_year_range");
  if (input.serialFrom && input.serialTo && String(input.serialFrom) > String(input.serialTo)) issues.push("invalid_serial_range");
  return { ok: issues.length === 0, issues, manufacturer, modelName, modelCode };
}

function upsertMachine(store, input, taxonomy) {
  const checked = validateMachineInput(input, taxonomy);
  if (!checked.ok) return { ok: false, issues: checked.issues };
  const providerId = input.providerId || input.source || "manual";
  const sourceRecordId = input.sourceRecordId || input.sourceId || null;
  const id =
    input.id ||
    (sourceRecordId
      ? kit.identifiers.stableId("ame-machine", [providerId, sourceRecordId])
      : kit.identifiers.stableId("ame-machine", [checked.manufacturer, checked.modelCode || checked.modelName]));

  const existingId = sourceRecordId ? kit.lookupSource(store, "machine", providerId, sourceRecordId) : null;
  const targetId = existingId || id;
  const previous = store.machines.get(targetId);
  const machine = {
    id: targetId,
    domain: "agricultural",
    manufacturer: checked.manufacturer,
    brand: String(input.brand || checked.manufacturer).trim(),
    family: input.family || input.machineFamily || null,
    type: input.type || input.machineType || null,
    categoryId: input.categoryId || null,
    modelName: checked.modelName || checked.modelCode,
    modelCode: checked.modelCode || null,
    variant: input.variant || input.modelVariant || null,
    yearFrom: input.yearFrom ?? input.productionYear ?? null,
    yearTo: input.yearTo ?? null,
    serialNumber: input.serialNumber || null,
    serialFrom: input.serialFrom || null,
    serialTo: input.serialTo || null,
    engineManufacturer: input.engineManufacturer || null,
    engineModel: input.engineModel || null,
    engineConfiguration: input.engineConfiguration || null,
    transmission: input.transmission || input.transmissionType || null,
    drive: input.drive || input.driveConfiguration || null,
    hydraulics: input.hydraulics || input.hydraulicConfiguration || null,
    ptoSpecification: input.ptoSpecification || null,
    ptoSpeed: input.ptoSpeed || null,
    linkageCategory: input.linkageCategory || input.threePointCategory || null,
    hitch: input.hitch || input.hitchConfiguration || null,
    voltage: input.voltage || input.electricalVoltage || null,
    implementType: input.implementType || null,
    region: input.region || null,
    revision: input.revision || null,
    generation: input.generation || input.productionGeneration || null,
    marketConfig: input.marketConfig || null,
    unverifiedFields: Array.isArray(input.unverifiedFields) ? input.unverifiedFields : [],
    quality: QUALITY_STATUS.OK,
    provenance: kit.createProvenance({ ...input, providerId, sourceRecordId }),
    createdAt: previous?.createdAt || kit.nowIso(),
    updatedAt: kit.nowIso(),
  };

  if (previous?.manufacturer && previous.manufacturer !== machine.manufacturer) {
    kit.recordConflict(store, {
      entityType: "machine",
      entityId: targetId,
      field: "manufacturer",
      values: [previous.manufacturer, machine.manufacturer],
      providers: [previous.provenance.providerId, providerId],
    });
    machine.quality = QUALITY_STATUS.WARNING;
  }

  store.machines.set(targetId, previous ? { ...previous, ...machine } : machine);
  if (sourceRecordId) kit.rememberSource(store, "machine", providerId, sourceRecordId, targetId);
  kit.appendAudit(store, { action: previous ? "machine.update" : "machine.create", entityId: targetId, domain: "agricultural" });
  return { ok: true, machine: store.machines.get(targetId), created: !previous };
}

module.exports = {
  validateMachineInput,
  upsertMachine,
  getMachine: (store, id) => store.machines.get(id) || null,
  listMachines: (store) => [...store.machines.values()],
};
