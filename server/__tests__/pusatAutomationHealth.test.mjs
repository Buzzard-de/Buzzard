import { describe, expect, it } from "vitest";

const { snapshot } = require("../lib/pusat/automationHealth.js");

describe("pusat automation health", () => {
  it("reports council and scheduler without live flags", () => {
    const snap = snapshot();
    expect(snap.live).toBe(false);
    expect(snap.council.councilMembers).toBeGreaterThanOrEqual(17);
    expect(snap.council.salesEnableBlocked).toBe(true);
    expect(snap.scheduler.liveRunner).toBe(false);
  });
});