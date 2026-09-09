/**
 * Automotive Core — vehicle model engine (wraps existing compatibility).
 */
const automotiveCompat = require("../automotive/automotiveVehicleCompatibility");
const { normalizeFitmentEntry } = require("../../lib/pim/fitmentSchema");

const VEHICLE_KINDS = Object.freeze([
  "car", "van", "truck", "bus", "tractor", "agriculturalMachine",
  "constructionMachine", "motorcycle", "scooter", "trailer", "semiTruck",
]);

function normalizeVehicle(raw = {}) {
  if (!raw || typeof raw !== "object") raw = {};
  const fit = normalizeFitmentEntry(raw) || {};
  const v = {
    make: fit.make || raw.brand || raw.make || null,
    brand: fit.make || raw.brand || raw.make || null,
    model: fit.model || null,
    generation: fit.generation || raw.variant || null,
    variant: fit.generation || raw.variant || null,
    body: fit.body || raw.body || null,
    yearFrom: fit.yearFrom ?? raw.yearFrom ?? raw.year ?? null,
    yearTo: fit.yearTo ?? raw.yearTo ?? raw.year ?? null,
    engine: fit.engine || null,
    engineCode: fit.engineCode || null,
    fuel: fit.fuel || null,
    displacement: fit.displacement || null,
    powerKW: fit.kw ?? raw.powerKW ?? null,
    powerPS: fit.ps ?? raw.powerPS ?? null,
    transmission: fit.transmission || null,
    drive: raw.drive || null,
    axle: raw.axle || null,
    wheelSize: raw.wheelSize || null,
    country: raw.country || null,
    vehicleKind: raw.vehicleKind || raw.vehicleType || "car",
    source: raw.source || "manual",
    verified: Boolean(raw.verified),
  };
  if (v.make) v.make = String(v.make).toLowerCase();
  if (v.model) v.model = String(v.model).toLowerCase();
  if (v.engine) v.engine = String(v.engine).toLowerCase();
  return v;
}

function validateVehicle(vehicle = {}) {
  const v = normalizeVehicle(vehicle);
  const errors = [];
  if (!v.make) errors.push("make required");
  if (!v.model) errors.push("model required");
  return {
    valid: errors.length === 0,
    status: errors.length ? "REVIEW_REQUIRED" : "PASS",
    errors,
    vehicle: v,
  };
}

function matchVehicle(product = {}, queryVehicle = {}) {
  const fitments = product.compatibleVehicles || product.fitment || product.vehicleFitment || [];
  const list = Array.isArray(fitments) ? fitments : [fitments];
  const query = normalizeVehicle({
    ...queryVehicle,
    yearFrom: queryVehicle.yearFrom ?? queryVehicle.year,
    yearTo: queryVehicle.yearTo ?? queryVehicle.year,
  });

  for (const raw of list) {
    const fit = normalizeVehicle(raw);
    if (!fit.model) continue;
    const matched = automotiveCompat.matchesVehicle(
      { make: fit.make, model: fit.model, yearFrom: fit.yearFrom, yearTo: fit.yearTo, engine: fit.engine },
      { make: query.make, model: query.model, yearFrom: query.yearFrom, yearTo: query.yearTo, engine: query.engine },
      { mode: "engine" }
    );
    if (matched) {
      return { match: true, confidence: 0.95, method: "compatibility", fitment: fit };
    }
    const modelMatch = automotiveCompat.matchesVehicle(
      { make: fit.make, model: fit.model, yearFrom: fit.yearFrom, yearTo: fit.yearTo, engine: fit.engine },
      { make: query.make, model: query.model, yearFrom: query.yearFrom, yearTo: query.yearTo, engine: query.engine },
      { mode: "model" }
    );
    if (modelMatch) {
      return { match: true, confidence: 0.85, method: "model", fitment: fit };
    }
  }

  return { match: false, confidence: 0, method: "none" };
}

module.exports = {
  VEHICLE_KINDS,
  normalizeVehicle,
  validateVehicle,
  matchVehicle,
  VEHICLE_TYPES: automotiveCompat.VEHICLE_TYPES,
};
