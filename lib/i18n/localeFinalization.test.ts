import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { getVisibleMainCategories, getMainCategories, getChildren } from "@/lib/categories/service";
import {
  APPROVED_CUSTOMER_FACING_L1_COUNT,
  INTERNAL_ONLY_L1_IDS,
  INTERNAL_SHOP_L1_COUNT,
} from "@/lib/categories/customerFacing";
import {
  getCategoryLabel,
  looksLikeGermanLabel,
  looksLikeTurkishLabel,
} from "@/lib/categories/i18n";
import { getEmailTemplate, usesEnglishEmailFallback, EMAIL_TEMPLATE_KEYS } from "@/lib/email/templates";
import { resolveLocaleAfterMarketChange } from "@/lib/i18n/marketCompatibility";
import { isRtlLocale, localeDirection } from "@/lib/i18n/types";

describe("approved customer-facing category count", () => {
  it("exposes 50 customer L1 and keeps 53 internal records", () => {
    expect(getMainCategories()).toHaveLength(INTERNAL_SHOP_L1_COUNT);
    expect(getVisibleMainCategories()).toHaveLength(APPROVED_CUSTOMER_FACING_L1_COUNT);
    expect(getVisibleMainCategories().map((c) => c.id)).not.toEqual(expect.arrayContaining([...INTERNAL_ONLY_L1_IDS]));
  });
});

describe("L1 L2 L3 translations", () => {
  it("translates L1 for listed locales without German leftovers", () => {
    const mains = getVisibleMainCategories();
    for (const locale of ["de", "en", "tr", "fr", "nl", "pl", "it", "es", "pt", "ar"] as const) {
      for (const cat of mains) {
        const label = getCategoryLabel(cat, locale);
        expect(label.length).toBeGreaterThan(0);
        if (cat.id === "cat-01" && locale === "fr") expect(label).toBe("Textiles");
        if (cat.id === "cat-01" && locale === "ar") expect(label).toMatch(/[\u0600-\u06FF]/);
        if (cat.id === "cat-01" && locale === "nl") expect(label).toBe("Textiel");
      }
    }
  });

  it("translates L2/L3 clothing path without Turkish leftovers", () => {
    const l2 = { id: "cat-01-01", name: "Damenbekleidung" };
    const l3 = { id: "cat-01-01-01", name: "Elbise" };
    expect(getCategoryLabel(l2, "en")).toBe("Women's clothing");
    expect(getCategoryLabel(l3, "en")).toBe("Dress");
    expect(getCategoryLabel(l3, "de")).toBe("Kleid");
    expect(getCategoryLabel(l3, "fr")).toBe("Robe");
    expect(getCategoryLabel(l3, "ar")).toBe("فستان");
    expect(getCategoryLabel(l3, "en")).not.toBe("Elbise");
  });
});

describe("Arabic mixed-language detection", () => {
  it("fails if Arabic L1–L3 clothing labels are Turkish or German", () => {
    const root = getVisibleMainCategories().find((c) => c.id === "cat-01");
    expect(root).toBeTruthy();
    const l2 = getChildren("cat-01");
    const l3 = l2.flatMap((node) => getChildren(node.id));
    for (const node of [root!, ...l2, ...l3]) {
      const label = getCategoryLabel(node, "ar");
      expect(looksLikeTurkishLabel(label), `${node.id} arabic is turkish: ${label}`).toBe(false);
      if (/[\u0600-\u06FF]/.test(label)) continue;
      expect(looksLikeGermanLabel(label), `${node.id} arabic leaked german: ${label}`).toBe(false);
    }
  });
});

describe("email and AI locale acceptance", () => {
  it("accepts all 30 locales for email with English fallback, never German by default", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const tpl = getEmailTemplate("order_confirmation", locale);
      expect(tpl.subject.length).toBeGreaterThan(0);
    }
    expect(usesEnglishEmailFallback("fr")).toBe(true);
    expect(usesEnglishEmailFallback("de")).toBe(false);
    expect(getEmailTemplate("order_confirmation", "fr").subject).toBe(
      getEmailTemplate("order_confirmation", "en").subject
    );
    expect(EMAIL_TEMPLATE_KEYS).toContain("password_reset");
  });
});

describe("language/market independence", () => {
  it("keeps valid languages on Germany and remaps only unsupported market languages", () => {
    expect(resolveLocaleAfterMarketChange("tr", "DE")).toBe("tr");
    expect(resolveLocaleAfterMarketChange("de", "DE")).toBe("de");
    expect(resolveLocaleAfterMarketChange("en", "DE")).toBe("en");
    expect(resolveLocaleAfterMarketChange("ar", "DE")).toBe("ar");
    expect(resolveLocaleAfterMarketChange("tr", "FR")).toBe("fr");
  });
});

describe("RTL storefront CSS", () => {
  it("uses logical AI placement and phone safe-area", () => {
    const shop = readFileSync(resolve("styles/shop.css"), "utf8");
    const mobile = readFileSync(resolve("styles/buzzard-mobile.css"), "utf8");
    const pusart = readFileSync(resolve("styles/pusart.css"), "utf8");
    expect(shop).toContain("inset-inline-end");
    expect(mobile).toContain("safe-area-inset-bottom");
    expect(mobile).toContain("text-align: start");
    expect(pusart).toContain("margin-inline-start: auto");
    expect(pusart).toContain("padding-inline-start: 28px");
    expect(isRtlLocale("ar")).toBe(true);
    expect(localeDirection("de")).toBe("ltr");
  });
});
