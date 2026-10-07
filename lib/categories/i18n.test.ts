import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import {
  formatMenuLabel,
  getCategoryLabel,
  listMasterCategoryIds,
  listMissingCategoryKeys,
  toCategoryDisplayUpperCase,
} from "./i18n";

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
    expect(getCategoryLabel({ id: "cat-03", name: "Reinigungsprodukte" }, "ar")).toBe("منتجات التنظيف");
  });

  it("does not fall back to German labels for other locales", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "fr")).toBe("Textiles");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "fr")).not.toBe("Textil");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "nl")).not.toBe("Textil");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "pl")).not.toBe("Textil");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "it")).not.toBe("Textil");
  });

  it("covers every master category in every enabled locale", () => {
    const ids = listMasterCategoryIds();
    expect(ids).toHaveLength(50);
    expect(ids).toContain("cat-01");
    expect(ids).toContain("cat-50");
    expect(ids).not.toContain("cat-30");
    expect(ids).not.toContain("cat-37");
    expect(ids).not.toContain("cat-39");
    for (const locale of SUPPORTED_LOCALES) {
      expect(listMissingCategoryKeys(locale)).toEqual([]);
      for (const id of ids) {
        const label = getCategoryLabel({ id, name: "FALLBACK" }, locale);
        expect(label).not.toBe("FALLBACK");
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });
});
