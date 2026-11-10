const { QUALITY_STATUS, VEHICLE_CLASSES } = require("./constants");
const kit = require("../machineryDomainKit");
const { inspectVin, publicVinView } = require("./vin");

function validateVehicleInput(input = {}) {
  const issues = [];
  const manufacturer = String(input.manufacturer || input.brand || "").trim();
  const model = String(input.model || input.modelName || "").trim();
  if (!manufacturer) issues.push("missing_manufacturer");
  if (!model) issues.push("missing_model");
  if (input.vehicleClass && !VEHICLE_CLASSES.includes(input.vehicleClass)) issues.push("unknown_vehicle_class");
  if (input.yearFrom && input.yearTo && Number(input.yearFrom) > Number(input.yearTo)) issues.push("invalid_year_range");
  if (input.categoryId && String(input.categoryId).startsWith("ame-cat-")) issues.push("agricultural_rejected");
  if (input.categoryId && String(input.categoryId).startsWith("cme-cat-")) issues.push("construction_rejected");
  return { ok: issues.length === 0, issues, manufacturer, model };
}

function upsertVehicle(store, input = {}) {
  const checked = validateVehicleInput(input);
  if (!checked.ok) return { ok: false, issues: checked.issues };
  const providerId = input.providerId || input.source || "manual";
  const sourceRecordId = input.sourceRecordId || input.id || null;
  const id =
    input.id ||
    (sourceRecordId
      ? kit.identifiers.stableId("vpe-veh", [providerId, sourceRecordId])
      : kit.identifiers.stableId("vpe-veh", [checked.manufacturer, checked.model, input.generation || input.engineCode || ""]));
  const existingId = sourceRecordId ? kit.lookupSource(store, "vehicle", providerId, sourceRecordId) : null;
  const targetId = existingId || id;
  const previous = store.machines.get(targetId);
  const vin = input.vin ? inspectVin(input.vin) : { ok: false };
  const vehicle = {
    id: targetId,
    domain: "automotive",
    vehicleClass: input.vehicleClass || "passenger",
    commercial: kit.isolation.isCommercialVehicleClass(input.vehicleClass),
    manufacturer: checked.manufacturer,
    brand: String(input.brand || checked.manufacturer).trim(),
    model: checked.model,
    generation: input.generation || input.type || null,
    variant: input.variant || null,
    bodyStyle: input.bodyStyle || null,
    yearFrom: input.yearFrom ?? null,
    yearTo: input.yearTo ?? null,
    region: input.region || input.market || null,
    fuelType: input.fuelType || null,
    engineManufacturer: input.engineManufacturer || null,
    engineFamily: input.engineFamily || null,
    engineCode: input.engineCode || null,
    displacement: input.displacement || null,
    output: input.output || input.engine || null,
    engineConfiguration: input.engineConfiguration || null,
    transmission: input.transmission || null,
    gearboxCode: input.gearboxCode || null,
    drivetrain: input.drivetrain || null,
    axleConfig: input.axleConfig || null,
    steering: input.steering || null,
    brakes: input.brakes || null,
    emissions: input.emissions || null,
    electricalArchitecture: input.electricalArchitecture || null,
    hybridConfiguration: input.hybridConfiguration || null,
    batteryConfiguration: input.batteryConfiguration || null,
    cabVariant: input.cabVariant || null,
    wheelbase: input.wheelbase || null,
    vin: publicVinView(vin),
    oemTypeId: input.oemTypeId || null,
    typeApproval: input.typeApproval || null,
    homologation: input.homologation || null,
    unverifiedFields: Array.isArray(input.unverifiedFields) ? input.unverifiedFields : [],
    quality: QUALITY_STATUS.OK,
    provenance: kit.createProvenance({ ...input, providerId, sourceRecordId }),
    createdAt: previous?.createdAt || kit.nowIso(),
    updatedAt: kit.nowIso(),
  };
  if (previous?.manufacturer && previous.manufacturer !== vehicle.manufacturer) {
    kit.recordConflict(store, {
      entityType: "vehicle",
      entityId: targetId,
      field: "manufacturer",
      values: [previous.manufacturer, vehicle.manufacturer],
      providers: [previous.provenance.providerId, providerId],
    });
    vehicle.quality = QUALITY_STATUS.WARNING;
  }
  store.machines.set(targetId, previous ? { ...previous, ...vehicle } : vehicle);
  if (sourceRecordId) kit.rememberSource(store, "vehicle", providerId, sourceRecordId, targetId);
  kit.appendAudit(store, { action: previous ? "vehicle.update" : "vehicle.create", entityId: targetId, domain: "automotive" });
  return { ok: true, vehicle: store.machines.get(targetId), created: !previous };
}

module.exports = {
  validateVehicleInput,
  upsertVehicle,
  getVehicle: (store, id) => store.machines.get(id) || null,
  listVehicles: (store) => [...store.machines.values()],
};
