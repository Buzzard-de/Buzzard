import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { startReturn } = require("../lib/logistics/v5/returnsEngine.js");

describe("a caller shipment id does not open a return", () => {
  it("blocks unknown, mock, foreign, and repeated calls without a record", async () => {
    const unknown = startReturn({ shipmentId: `ship-${Date.now()}`, orderId: "ord-1", customerId: "c1", ownerId: "c1" });
    expect(unknown.ok).toBe(false);
    expect(unknown.recorded).toBe(false);
    expect(unknown.requested).toBe(false);
    expect(unknown.approved).toBe(false);
    expect(unknown.received).toBe(false);
    expect(unknown.state).toBe("BLOCKED_EXTERNAL");
    expect(unknown.shipmentId).toBeNull();
    expect(unknown.shipmentVerified).toBe(false);
    expect(unknown.code).toBe("SHIPMENT_UNVERIFIED");

    const mock = startReturn({ shipmentId: "MOCK-1", customerId: "c1" });
    expect(mock.code).toBe("MOCK_NOT_COMMERCIAL");
    expect(mock.recorded).toBe(false);
    expect(JSON.stringify(mock)).not.toContain("MOCK-1");

    const foreign = startReturn({ shipmentId: "ship-foreign", customerId: "c1", ownerId: "c2" });
    expect(foreign.code).toBe("OWNERSHIP_UNVERIFIED");
    expect(foreign.ownershipVerified).toBe(false);
    expect(foreign.recorded).toBe(false);

    const [first, second] = await Promise.all([
      Promise.resolve().then(() => startReturn({ shipmentId: "ship-repeat", orderId: "ord-9", customerId: "c9" })),
      Promise.resolve().then(() => startReturn({ shipmentId: "ship-repeat", orderId: "ord-9", customerId: "c9" })),
    ]);
    const duplicates = [first, second].filter((row) => row.duplicate);
    expect(duplicates).toHaveLength(1);
    expect(first.recorded).toBe(false);
    expect(second.recorded).toBe(false);
  });
});
