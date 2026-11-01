import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, isSupportedLanguage, ROUTING_LOCALES } from "./languages";
import { loadedLanguageCount, translate } from "./translations";

describe("30 language catalogs", () => {
  it("loads all 30 language catalogs", () => {
    expect(LANGUAGE_CODES).toHaveLength(30);
    expect(loadedLanguageCount()).toBe(30);
    expect(ROUTING_LOCALES).toEqual(["de", "en", "tr", "ar"]);
  });

  it("resolves a known key per language without mixing German into English", () => {
    expect(translate("de", "header.login")).toBe("Anmelden");
    expect(translate("en", "header.login")).toBe("Sign in");
    expect(translate("bg", "header.login")).not.toBe("Anmelden");
    expect(isSupportedLanguage("ga")).toBe(true);
    expect(isSupportedLanguage("xx")).toBe(false);
  });
});
