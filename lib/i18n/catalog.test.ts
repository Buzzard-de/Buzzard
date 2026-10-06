import { describe, expect, it } from "vitest";
import { translate } from "./translations";

describe("i18n catalog keys", () => {
  it("maps header.login per locale", () => {
    expect(translate("de", "header.login")).toBe("Anmelden");
    expect(translate("en", "header.login")).toBe("Sign in");
    expect(translate("tr", "header.login")).toBe("Giriş yap");
    expect(translate("ar", "header.login")).toBe("تسجيل الدخول");
  });

  it("maps home.subcategories per locale", () => {
    expect(translate("de", "home.subcategories")).toBe("Unterkategorien");
    expect(translate("tr", "home.subcategories")).toBe("Alt kategoriler");
    expect(translate("en", "home.subcategories")).toBe("Subcategories");
  });

  it("maps mobile.startShopping per locale", () => {
    expect(translate("de", "mobile.startShopping")).toContain("Einkaufen");
    expect(translate("tr", "mobile.startShopping")).toContain("Alışverişe");
    expect(translate("en", "mobile.startShopping")).toContain("Start shopping");
  });

  it("maps mobile empty states per locale", () => {
    expect(translate("de", "mobile.emptyCategories")).toContain("Keine Kategorien");
    expect(translate("tr", "mobile.emptyHint")).toContain("arama");
    expect(translate("en", "mobile.emptyHint")).toContain("search");
  });

  it("maps category.jsonLdDescription from catalog", () => {
    expect(translate("de", "category.jsonLdDescription")).toContain("Unterkategorien");
    expect(translate("tr", "category.jsonLdDescription")).toContain("alt kategoriler");
    expect(translate("en", "category.jsonLdDescription")).toContain("subcategories");
  });
});
