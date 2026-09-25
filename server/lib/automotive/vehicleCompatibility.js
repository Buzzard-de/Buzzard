/**
 * Generic vehicle compatibility engine.
 *
 * Pure deterministic logic.
 * No supplier/API/network access.
 * TecDoc-ready hierarchy — live integration remains separate.
 */
function normalizeCompatibility(input = {}) {
  return {
    vehicleType: input.vehicleType ?? null,
    make: input.make ?? null,
    model: input.model ?? null,
    generation: input.generation ?? null,
    yearFrom: input.yearFrom ?? null,
    yearTo: input.yearTo ?? null,
    engine: input.engine ?? null,
    fuel: input.fuel ?? null,
    powerKw: input.powerKw ?? null,
    drivetrain: input.drivetrain ?? null,
    oemReferences: Array.isArray(input.oemReferences) ? input.oemReferences : [],
    tecdocReference: input.tecdocReference ?? null,
  };
}

function matchesVehicle(productCompatibility, vehicle) {
  const p = normalizeCompatibility(productCompatibility);
  const v = normalizeCompatibility(vehicle);

  const fields = ["vehicleType", "make", "model", "generation", "engine", "fuel", "drivetrain"];
  for (const field of fields) {
    if (p[field] !== null && v[field] !== null && p[field] !== v[field]) {
      return false;
    }
  }

  if (p.yearFrom !== null && v.yearTo !== null && v.yearTo < p.yearFrom) {
    return false;
  }
  if (p.yearTo !== null && v.yearFrom !== null && v.yearFrom > p.yearTo) {
    return false;
  }

  return true;
}

function filterCompatibleProducts(products, vehicle) {
  return products.filter((product) => matchesVehicle(product.compatibility, vehicle));
}

module.exports = {
  normalizeCompatibility,
  matchesVehicle,
  filterCompatibleProducts,
};
