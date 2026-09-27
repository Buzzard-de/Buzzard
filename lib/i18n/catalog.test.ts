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

  it("maps category.jsonLdDescription from catalog", () => {
    expect(translate("de", "category.jsonLdDescription")).toContain("Unterkategorien");
    expect(translate("tr", "category.jsonLdDescription")).toContain("alt kategoriler");
    expect(translate("en", "category.jsonLdDescription")).toContain("subcategories");
  });
});
