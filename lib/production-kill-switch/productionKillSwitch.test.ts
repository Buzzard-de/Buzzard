import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getProductionKillSwitch,
  isProductionKillSwitchActive,
  setProductionGlobalKillSwitch,
  setDomainKillSwitch,
  resetGlobalKillSwitchForTests,
} from "./index";
import { resetProductionAccessAuditForTests } from "@/lib/production-access/audit";

const ORIGINAL = { ...process.env };

describe("Global production kill switch", () => {
  beforeEach(() => {
    resetGlobalKillSwitchForTests();
    resetProductionAccessAuditForTests();
    delete process.env.PRODUCTION_GLOBAL_KILL_SWITCH;
    delete process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    resetGlobalKillSwitchForTests();
  });

  it("defaults to inactive", () => {
    expect(isProductionKillSwitchActive()).toBe(false);
  });

  it("global kill switch blocks all domains", () => {
    setProductionGlobalKillSwitch({ enabled: true, actor: "ops@test.com", reason: "test" });
    expect(isProductionKillSwitchActive()).toBe(true);
    expect(isProductionKillSwitchActive("PAYMENTS")).toBe(true);
  });

  it("domain kill switch blocks specific domain", () => {
    setDomainKillSwitch({ domain: "PAYMENTS", enabled: true, actor: "ops@test.com" });
    expect(isProductionKillSwitchActive("PAYMENTS")).toBe(true);
    expect(isProductionKillSwitchActive("CARRIER")).toBe(false);
  });

  it("persists state in memory", () => {
    setProductionGlobalKillSwitch({ enabled: true, actor: "ops@test.com" });
    const state = getProductionKillSwitch();
    expect(state.global).toBe(true);
    expect(state.updatedBy).toBe("ops@test.com");
  });
});
