import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tecdoc = require("../lib/adapters/tecdocSandboxService.js");

describe("TecDoc sandbox", () => {
  it("returns unavailable without credentials", async () => {
    delete process.env.TECDOC_API_KEY;
    const vehicles = await tecdoc.lookupVehicle({ q: "golf" });
    expect(vehicles.ok).toBe(false);
    expect(vehicles.code).toBe("TECDOC_UNAVAILABLE");
  });

  it("serves mock compatibility when allowed", async () => {
    const fit = await tecdoc.compatibility("MOCK-001");
    expect(fit.ok).toBe(true);
    expect(fit.matches.length).toBeGreaterThan(0);
    expect(fit.mock).toBe(true);
  });
});