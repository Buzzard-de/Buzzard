import { expect, it } from "vitest";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import { isolatedHreflang, isolatedProductSeo, listingSeo } from "./productSeo";

const sample = ["de", "en", "tr", "ar", "fr", "nl", "pl", "es"];

it("keeps product SEO inside the 30-locale registry and avoids duplicate canonicals", () => {
  expect(LANGUAGE_CODES).toHaveLength(30);
  for (const locale of LANGUAGE_CODES) {
    const seo = isolatedProductSeo("syn-pad", locale);
    expect(seo.humanReviewed).toBe(false);
    expect(seo.review).toBe("UNREVIEWED");
    expect(seo.title).not.toMatch(/12\.34|buzzard\.db/);
    if (seo.status === "MISSING_TRANSLATION") expect(seo.title).toBe("Buzzard");
  }
  for (const locale of sample) {
    const seo = isolatedProductSeo("syn-pad", locale);
    expect(["PRESENT", "MISSING_TRANSLATION"]).toContain(seo.status);
  }
  expect(isolatedProductSeo("syn-pad", "de").provenance).toBe("SOURCE_DE");
  expect(isolatedProductSeo("syn-pad", "de").title).toContain("Bremsbelag");
  expect(isolatedProductSeo("syn-pad", "tr").title).toContain("fren");
  expect(isolatedProductSeo("syn-pad", "tr").provenance).toBe("UNREVIEWED_CATALOG");
  expect(isolatedProductSeo("syn-pad", "ar").dir).toBe("rtl");
  expect(isolatedProductSeo("syn-pad", "fr").status).toBe("MISSING_TRANSLATION");
  expect(isolatedProductSeo("syn-pad", "fr").title).not.toContain("Bremsbelag");
  expect(isolatedProductSeo("syn-pad", "<script>").status).toBe("LOCALE_REJECTED");
  expect("i".toLocaleUpperCase("tr")).toBe("İ");
  const links = isolatedHreflang("syn-pad");
  expect(links.duplicateCanonicals).toBe(false);
  expect(links.links.map((link) => link.locale).sort()).toEqual(["ar", "de", "en", "tr"]);
  expect(new Set(links.links.map((link) => link.href)).size).toBe(links.links.length);
  expect(listingSeo("de").title).toContain("Produkte");
  expect(listingSeo("tr").title).toBe("Buzzard");
  expect(listingSeo("tr").humanReviewed).toBe(false);
});
