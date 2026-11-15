import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { roster, canShare, CLASSIFICATION } = require("../lib/pusat/council.js");
const { identity, coordinate } = require("../lib/pusat/sinanBey.js");
const { councilStatus } = require("../lib/logistics/v5/aiLogisticsCouncil.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Sinan Bey council membership", () => {
  it("is on the roster as male architect with the saved avatar", () => {
    expect(existsSync("public/council/sinan-bey.png")).toBe(true);
    const official = roster().find((m) => m.id === "sinan_bey");
    expect(official.name).toBe("Sinan Bey");
    expect(official.role).toBe("chief_software_architect");
    expect(official.canEnableSales).toBe(false);
    expect(official.canExecutePayments).toBe(false);
    const legacy = roster("legacy").find((m) => m.id === "sinan_bey");
    expect(legacy.name).toBe("Sinan Bey");
    expect(legacy.role).toBe("software_architect");
    expect(legacy.gender).toBe("male");
    expect(legacy.avatar).toBe("/council/sinan-bey.png");
    expect(legacy.cannotChair).toBe(true);
    expect(legacy.cannotEnableSales).toBe(true);
    expect(legacy.cannotExecutePayments).toBe(true);
    expect(legacy.commercialCommit).toBe(false);
    expect(legacy.alwaysOnProcess).toBe(false);
    expect(identity().replacesEsat).toBe(false);
    expect(identity().replacesDogu).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });

  it("coordinates with Pusat, Doğu Bey and logistics via allowed share only", () => {
    expect(canShare({ fromId: "sinan_bey", toId: "pusat", classification: CLASSIFICATION.SHARED })).toBe(true);
    expect(canShare({ fromId: "sinan_bey", toId: "dogu_bey", classification: CLASSIFICATION.SHARED })).toBe(true);
    expect(canShare({ fromId: "sinan_bey", toId: "logistics_ai", classification: CLASSIFICATION.PUBLIC })).toBe(true);
    expect(canShare({ fromId: "sinan_bey", toId: "esat_bey", classification: CLASSIFICATION.RESTRICTED })).toBe(false);
    const task = coordinate({ toId: "dogu_bey", title: "architecture-sync", classification: CLASSIFICATION.SHARED });
    expect(task.ok).toBe(true);
    expect(task.via).toBe("pusat");
    expect(task.liveShipment).toBe(false);
    expect(councilStatus().roles.some((r) => r.id === "sinan_bey")).toBe(true);
    expect(councilStatus().commercialCommitForbidden).toBe(true);
  });
});
