import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { matchesVehicle, validateCompatibilitySchema } = require("../core/automotive/automotiveVehicleCompatibility.js");

test("vehicle compatibility exact match", () => {
  assert.equal(
    matchesVehicle(
      { vehicleType: "passenger-car", make: "VW", model: "Golf", yearFrom: 2015, yearTo: 2020 },
      { vehicleType: "passenger-car", make: "VW", model: "Golf", yearFrom: 2017, yearTo: 2019 }
    ),
    true
  );
});

test("vehicle compatibility rejects model mismatch", () => {
  assert.equal(
    matchesVehicle(
      { make: "VW", model: "Golf" },
      { make: "VW", model: "Polo" }
    ),
    false
  );
});

test("compatibility schema validates vehicle type", () => {
  const bad = validateCompatibilitySchema({ vehicleType: "not-a-real-type" });
  assert.equal(bad.valid, false);
  const good = validateCompatibilitySchema({ vehicleType: "passenger-car", yearFrom: 2010, yearTo: 2020 });
  assert.equal(good.valid, true);
});

test("OEM reference mode", () => {
  assert.equal(
    matchesVehicle(
      { oemReferences: ["OEM-123", "OEM-456"] },
      { make: "Any" },
      { oemNumber: "OEM-123" }
    ),
    true
  );
});
