import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createSotConflictDetector } = require("../lib/sot/sotConflictDetector.js");

describe("sot conflict detector", () => {
  const detector = createSotConflictDetector();

  it("classifies stale, ownership, and version conflicts", () => {
    expect(
      detector.detectConflict({
        entity: "PRODUCT",
        sotVersion: 12,
        incomingVersion: 10,
        source: "supplier_catalog",
      }).type
    ).toBe("STALE_WRITE");
    expect(
      detector.detectConflict({
        entity: "PRODUCT",
        sotVersion: 12,
        incomingVersion: 15,
        source: "marketplace",
      }).type
    ).toBe("OWNERSHIP_CONFLICT");
    expect(
      detector.detectConflict({
        entity: "PRICE",
        sotVersion: 20,
        incomingVersion: 21,
        expectedVersion: 18,
        source: "pricing_engine",
      }).type
    ).toBe("VERSION_CONFLICT");
    expect(
      detector.detectConflict({
        entity: "AVAILABILITY",
        sotVersion: 3,
        incomingVersion: 4,
        source: "availability_engine",
      }).type
    ).toBe("NO_CONFLICT");
  });
});
