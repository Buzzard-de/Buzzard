import { describe, expect, it } from "vitest";
import { machineryHubCopy, resolveMachineryHubDomain } from "./hubDomain";

describe("resolveMachineryHubDomain", () => {
  it("maps automotive and tire hubs plus their children", () => {
    expect(resolveMachineryHubDomain("cat-05")).toBe("automotive");
    expect(resolveMachineryHubDomain("cat-05-21")).toBe("automotive");
    expect(resolveMachineryHubDomain("cat-54")).toBe("automotive");
    expect(resolveMachineryHubDomain("cat-54-01")).toBe("automotive");
  });

  it("maps agricultural and construction trees only", () => {
    expect(resolveMachineryHubDomain("cat-20")).toBe("agricultural");
    expect(resolveMachineryHubDomain("cat-20-02")).toBe("agricultural");
    expect(resolveMachineryHubDomain("cat-55")).toBe("construction");
    expect(resolveMachineryHubDomain("cat-55-01-01")).toBe("construction");
  });

  it("does not attach engines to unrelated shop categories", () => {
    expect(resolveMachineryHubDomain("cat-21")).toBeNull();
    expect(resolveMachineryHubDomain("cat-01")).toBeNull();
    expect(resolveMachineryHubDomain("cat-56")).toBeNull();
  });

  it("keeps dedicated search pages per domain", () => {
    expect(machineryHubCopy("automotive").moreHref).toBe("/fahrzeugteile-suche/");
    expect(machineryHubCopy("agricultural").moreHref).toBe("/landmaschinen-suche/");
    expect(machineryHubCopy("construction").moreHref).toBe("/baumaschinen-suche/");
  });
});
