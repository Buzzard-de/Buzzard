import { describe, expect, it } from "vitest";
import { getCategoryLabel } from "./i18n";

describe("category labels", () => {
  it("uses Turkish catalog for main categories, not English", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "tr")).toBe("Tekstil");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "tr")).toBe("Otomotiv");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "tr")).not.toBe("Textiles");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "tr")).not.toBe("Automotive");
  });

  it("keeps German and English catalogs", () => {
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "de")).toBe("Textil");
    expect(getCategoryLabel({ id: "cat-01", name: "Textil" }, "en")).toBe("Textiles");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "de")).toBe("Automotive");
    expect(getCategoryLabel({ id: "cat-05", name: "Automotive" }, "en")).toBe("Automotive");
  });
});
