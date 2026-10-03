import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createAvailabilitySot } = require("../lib/sot/availabilitySot.js");
const { ACTORS } = require("../lib/sot/sourceOfTruthRegistry.js");

describe("availability SoT", () => {
  it("accepts engine writes and rejects stale supplier versions", () => {
    const sot = createAvailabilitySot({ logAudit: () => {} });
    const first = sot.updateAvailability({
      actor: ACTORS.AVAILABILITY_ENGINE,
      productId: "p1",
      incomingVersion: 1,
    });
    expect(first.version).toBe(1);
    expect(() =>
      sot.updateAvailability({
        actor: ACTORS.AVAILABILITY_ENGINE,
        productId: "p1",
        incomingVersion: 0,
        source: "supplier_stock",
      })
    ).toThrow(/Stale|SOT_STALE_WRITE/);
    expect(() =>
      sot.updateAvailability({ actor: ACTORS.SUPPLIER, productId: "p1", incomingVersion: 2 })
    ).toThrow(/cannot write/);
  });
});
