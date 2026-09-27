/**
 * Generic vehicle compatibility engine — no supplier/API/network access.
 */
const VEHICLE_TYPES = [
  "passenger-car",
  "suv",
  "van",
  "light-commercial",
  "truck",
  "bus",
  "trailer",
  "semi-trailer",
  "caravan-motorhome",
  "motorcycle",
  "scooter",
  "moped",
  "atv-quad",
  "tractor",
  "agricultural-machinery",
  "construction-machinery",
  "industrial-utility",
  "off-road",
  "racing",
  "electric-vehicle",
  "hybrid-vehicle",
];

function normalizeCompatibility(input = {}) {
  return {
    vehicleType: input.vehicleType ?? null,
    manufacturer: input.manufacturer ?? input.make ?? null,
    brand: input.brand ?? input.make ?? null,
    make: input.make ?? input.manufacturer ?? null,
    model: input.model ?? null,
    generation: input.generation ?? null,
    yearFrom: input.yearFrom ?? null,
    yearTo: input.yearTo ?? null,
    engine: input.engine ?? null,
    engineCode: input.engineCode ?? null,
    fuelType: input.fuelType ?? input.fuel ?? null,
    fuel: input.fuel ?? input.fuelType ?? null,
    enginePower: input.enginePower ?? input.powerKw ?? null,
    powerKw: input.powerKw ?? input.enginePower ?? null,
    bodyType: input.bodyType ?? null,
    transmission: input.transmission ?? null,
    drivetrain: input.drivetrain ?? null,
    oemReferences: Array.isArray(input.oemReferences) ? input.oemReferences : [],
    tecdocReference: input.tecdocReference ?? null,
  };
}

function normalizeVehicleRecord(record = {}) {
  return normalizeCompatibility(record);
}

function matchesVehicle(productCompatibility, vehicle, options = {}) {
  const p = normalizeCompatibility(productCompatibility);
  const v = normalizeCompatibility(vehicle);
  const mode = options.mode || "exact";

  const fields = ["vehicleType", "make", "model", "generation", "engine", "fuel", "drivetrain", "engineCode"];
  for (const field of fields) {
    if (p[field] !== null && v[field] !== null && p[field] !== v[field]) {
      return false;
    }
  }

  if (p.yearFrom !== null && v.yearTo !== null && v.yearTo < p.yearFrom) return false;
  if (p.yearTo !== null && v.yearFrom !== null && v.yearFrom > p.yearTo) return false;

  if (mode === "model" && p.model && v.model && p.model === v.model) return true;
  if (mode === "engine" && p.engine && v.engine && p.engine === v.engine) return true;

  if (options.oemNumber && Array.isArray(p.oemReferences) && p.oemReferences.length) {
    return p.oemReferences.includes(options.oemNumber);
  }

  return true;
}

function filterCompatibleProducts(products, vehicle, options = {}) {
  return products.filter((product) =>
    matchesVehicle(product.compatibility || product.compatibleVehicles?.[0], vehicle, options)
  );
}

function validateCompatibilitySchema(record) {
  const errors = [];
  const normalized = normalizeCompatibility(record);
  if (normalized.vehicleType && !VEHICLE_TYPES.includes(normalized.vehicleType)) {
    errors.push("invalid vehicleType");
  }
  if (normalized.yearFrom !== null && normalized.yearTo !== null && normalized.yearFrom > normalized.yearTo) {
    errors.push("invalid year range");
  }
  return { valid: errors.length === 0, errors, normalized };
}

module.exports = {
  VEHICLE_TYPES,
  normalizeCompatibility,
  normalizeVehicleRecord,
  matchesVehicle,
  filterCompatibleProducts,
  validateCompatibilitySchema,
};
