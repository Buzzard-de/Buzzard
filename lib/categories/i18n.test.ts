import { describe, expect, it } from "vitest";
import { formatMenuLabel, getCategoryLabel, toCategoryDisplayUpperCase } from "./i18n";

describe("category labels", () => {
  it("uses Turkish catalog for main categories, not English", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "tr")).toBe("Tekstil");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "tr")).toBe("Otomotiv");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "tr")).not.toBe("Textiles");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "tr")).not.toBe("Automotive");
  });

  it("uses Turkish locale uppercase for menu labels", () => {
    expect(toCategoryDisplayUpperCase("Tekstil", "tr")).toBe("TEKSTİL");
    expect(toCategoryDisplayUpperCase("Otomotiv", "tr")).toBe("OTOMOTİV");
    expect(formatMenuLabel({ id: "cat-01", menu_order: 1, name: "Textil" }, "tr")).toBe("01. TEKSTİL");
    expect(formatMenuLabel({ id: "cat-05", menu_order: 5, name: "Automotive" }, "tr")).toBe("05. OTOMOTİV");
  });

  it("keeps German and English catalogs", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "de")).toBe("Textil");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "en")).toBe("Textiles");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "de")).toBe("Automotive");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "en")).toBe("Automotive");
  });
});
