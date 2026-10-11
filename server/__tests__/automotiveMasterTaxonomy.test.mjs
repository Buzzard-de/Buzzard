import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  AUTOMOTIVE_ROOT,
  AUTOMOTIVE_CATEGORIES,
  VEHICLE_TYPES,
  AUTOMOTIVE_SAFETY_POLICY,
  TIRE_ATTRIBUTE_KEYS,
} = require("../core/automotiveTaxonomy.js");
const { matchesVehicle } = require("../lib/automotive/vehicleCompatibility.js");
const { validateAutomotiveProduct } = require("../lib/catalog/automotiveTaxonomyValidator.js");

test("automotive root exists", () => {
  assert.equal(AUTOMOTIVE_ROOT.id, "automotive-motor-vehicles");
});

test("automotive categories exist", () => {
  assert.ok(AUTOMOTIVE_CATEGORIES.length >= 30);
});

test("all required vehicle groups exist", () => {
  const required = [
    "passenger-car",
    "truck",
    "bus",
    "motorcycle",
    "scooter",
    "atv-quad",
    "tractor",
    "agricultural-machinery",
    "construction-machinery",
    "trailer",
    "semi-trailer",
    "caravan-motorhome",
    "electric-vehicle",
    "hybrid-vehicle",
  ];
  for (const type of required) {
    assert.ok(VEHICLE_TYPES.includes(type), type);
  }
});

test("tires category exists", () => {
  assert.ok(AUTOMOTIVE_CATEGORIES.some((c) => c.id === "tires"));
});

test("tire category supports trailer", () => {
  const tires = AUTOMOTIVE_CATEGORIES.find((c) => c.id === "tires");
  assert.ok(tires.vehicleTypes.includes("trailer"));
});

test("tire category supports tractor", () => {
  const tires = AUTOMOTIVE_CATEGORIES.find((c) => c.id === "tires");
  assert.ok(tires.vehicleTypes.includes("tractor"));
});

test("tire category supports construction machinery", () => {
  const tires = AUTOMOTIVE_CATEGORIES.find((c) => c.id === "tires");
  assert.ok(tires.vehicleTypes.includes("construction-machinery"));
});

test("tire attribute keys defined", () => {
  assert.ok(TIRE_ATTRIBUTE_KEYS.includes("width"));
  assert.ok(TIRE_ATTRIBUTE_KEYS.includes("loadIndex"));
  assert.ok(TIRE_ATTRIBUTE_KEYS.includes("speedRating"));
});

test("vehicle compatibility matches compatible vehicle", () => {
  assert.equal(
    matchesVehicle(
      {
        vehicleType: "passenger-car",
        make: "Example",
        model: "Model",
        yearFrom: 2020,
        yearTo: 2025,
      },
      {
        vehicleType: "passenger-car",
        make: "Example",
        model: "Model",
        yearFrom: 2022,
        yearTo: 2024,
      }
    ),
    true
  );
});

test("vehicle compatibility rejects different model", () => {
  assert.equal(
    matchesVehicle(
      {
        vehicleType: "passenger-car",
        make: "Example",
        model: "Model A",
      },
      {
        vehicleType: "passenger-car",
        make: "Example",
        model: "Model B",
      }
    ),
    false
  );
});

test("automatic publish is rejected", () => {
  const result = validateAutomotiveProduct({
    sku: "TEST-AUTO-001",
    categoryId: "tires",
    state: "PUBLISHED",
  });
  assert.equal(result.valid, false);
});

test("safety remains fail-closed", () => {
  assert.equal(AUTOMOTIVE_SAFETY_POLICY.diagnosticOnly, true);
  assert.equal(AUTOMOTIVE_SAFETY_POLICY.autoActivate, false);
  assert.equal(AUTOMOTIVE_SAFETY_POLICY.activationAllowed, false);
  assert.equal(AUTOMOTIVE_SAFETY_POLICY.supplierLive, false);
  assert.equal(AUTOMOTIVE_SAFETY_POLICY.salesEnabled, false);
  assert.equal(AUTOMOTIVE_SAFETY_POLICY.publishEnabled, false);
  assert.equal(AUTOMOTIVE_SAFETY_POLICY.humanApprovalRequired, true);
});
