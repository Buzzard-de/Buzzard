import { describe, it, expect } from "vitest";
import { vehicleYears } from "./static";
import {
  MIN_VEHICLE_SEARCH_YEAR,
  buildVehicleSearchYears,
  isAcceptedVehicleSearchYear,
  maxVehicleSearchYear,
} from "./yearRange";

describe("vehicle search year list", () => {
  it("includes 1960 through 2010 and rejects 1959", () => {
    expect(MIN_VEHICLE_SEARCH_YEAR).toBe(1960);
    expect(vehicleYears).toContain("1960");
    expect(vehicleYears).toContain("1970");
    expect(vehicleYears).toContain("1990");
    expect(vehicleYears).toContain("2009");
    expect(vehicleYears).toContain("2010");
    expect(vehicleYears).not.toContain("1959");
    expect(vehicleYears[vehicleYears.length - 1]).toBe("1960");
    expect(Number(vehicleYears[0])).toBe(maxVehicleSearchYear());
    expect(isAcceptedVehicleSearchYear(1960)).toBe(true);
    expect(isAcceptedVehicleSearchYear(2010)).toBe(true);
    expect(isAcceptedVehicleSearchYear(1959)).toBe(false);
    expect(isAcceptedVehicleSearchYear(maxVehicleSearchYear() + 2)).toBe(false);
    expect(buildVehicleSearchYears(1960, 1961)).toEqual(["1961", "1960"]);
  });
});
