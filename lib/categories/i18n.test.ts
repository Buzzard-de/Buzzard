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

  it("uses Arabic catalog instead of Turkish source names", () => {
    const arabic = getCategoryLabel({ id: "cat-01", name: "Tekstil" }, "ar");
    expect(arabic).toMatch(/[\u0600-\u06FF]/);
    expect(arabic).not.toBe("Tekstil");
  });

  it("falls back to German labels for locales without a category map", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Tekstil" }, "fr")).toBe("Textil");
    expect(getCategoryLabel({ id: "cat-01", name: "Tekstil" }, "fr")).not.toBe("Tekstil");
  });
});
