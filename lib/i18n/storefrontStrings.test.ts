import { expect, it } from "vitest";
import { LANGUAGE_CODES } from "./languages";
import { storefrontString } from "./translations";

it("covers the product page strings in every locale without a human-review claim", () => {
  for (const code of LANGUAGE_CODES) {
    const title = storefrontString(code, "catalog.pageTitle");
    const lead = storefrontString(code, "catalog.pageLead");
    const live = storefrontString(code, "catalog.liveAttached");
    expect(title.status).toBe("PRESENT");
    expect(title.humanReviewed).toBe(false);
    expect(title.review).toBe("UNREVIEWED");
    expect(lead.text).not.toBe("MISSING_TRANSLATION");
    expect(live.text).toContain("{count}");
  }
  expect(storefrontString("de", "catalog.pageTitle").provenance).toBe("SOURCE_DE");
  expect(storefrontString("tr", "catalog.pageTitle").provenance).toBe("MACHINE_DRAFT");
  expect(storefrontString("tr", "catalog.pageTitle").text).toContain("Ürün");
  expect("i".toLocaleUpperCase("tr")).toBe("İ");
  expect(storefrontString("ar", "catalog.pageTitle").text).toMatch(/[\u0600-\u06FF]/);
  const missing = storefrontString("fr", "catalog.missingKey");
  expect(missing.status).toBe("MISSING_TRANSLATION");
  expect(missing.text).toBe("MISSING_TRANSLATION");
});
