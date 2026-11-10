import { describe, expect, it } from "vitest";
import { formatMenuLabel, getCategoryLabel, toCategoryDisplayUpperCase } from "./i18n";
import { getHubExtensions, getActiveShopMainCategories, getMainCategories } from "./service";
import { getMasterCategories, isRetiredShopId } from "./master";

describe("category labels", () => {
  it("uses Turkish catalog for main categories, not English", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "tr")).toBe("Tekstil");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "tr")).toBe("Otomotiv ve motorlu araçlar");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "tr")).not.toBe("Textiles");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "tr")).not.toBe("Automotive");
  });

  it("uses Turkish locale uppercase for menu labels", () => {
    expect(toCategoryDisplayUpperCase("Tekstil", "tr")).toBe("TEKSTİL");
    expect(toCategoryDisplayUpperCase("Otomotiv", "tr")).toBe("OTOMOTİV");
    expect(formatMenuLabel({ id: "cat-01", menu_order: 1, name: "Textil" }, "tr")).toBe("01. TEKSTİL");
    expect(formatMenuLabel({ id: "cat-05", menu_order: 5, name: "Automotive" }, "tr")).toBe(
      "05. OTOMOTİV VE MOTORLU ARAÇLAR"
    );
  });

  it("adds hub L1 extensions without dropping existing mains", () => {
    const mains = getMainCategories();
    expect(mains.some((c) => c.id === "cat-01")).toBe(true);
    expect(mains.some((c) => c.id === "cat-53")).toBe(true);
    for (const id of ["cat-54", "cat-55", "cat-56"]) {
      expect(mains.some((c) => c.id === id) || getHubExtensions().some((h) => h.id === id)).toBe(true);
    }
    expect(mains.length).toBeGreaterThanOrEqual(53);
  });

  it("retires food, drinks, and jewelry from the active shop tree", () => {
    const active = getActiveShopMainCategories();
    expect(active.length).toBeGreaterThanOrEqual(50);
    expect(active.some((c) => c.id === "cat-25" || c.slug.includes("lebensmittel"))).toBe(false);
    expect(active.some((c) => c.id === "cat-43" || c.slug.includes("schmuck"))).toBe(false);
    expect(active.some((c) => c.id === "cat-46")).toBe(false);
    expect(isRetiredShopId("cat-25")).toBe(true);
  });

  it("keeps an approved master tree of 50 with bicycle 49 and renewable 50", () => {
    const master = getMasterCategories();
    expect(master).toHaveLength(50);
    expect(master.find((c) => c.num === 49)?.slug).toBe("fahrrad-e-bike");
    expect(master.find((c) => c.num === 50)?.slug).toBe("erneuerbare-energie");
    expect(master.some((c) => /lebensmittel|schmuck|getraenke/.test(c.slug))).toBe(false);
  });

  it("keeps German and English catalogs", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "de")).toBe("Textil");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "en")).toBe("Textiles");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "de")).toBe(
      "Automotive und motorisierte Fahrzeuge"
    );
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "en")).toBe(
      "Automotive and motor vehicles"
    );
  });
});
