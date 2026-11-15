import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "./languages";
import {
  DEFAULT_LOCALE,
  LOCALE_PREFIX_PATTERN,
  hreflangAlternates,
  localeLandingPath,
  localizePath,
  stripLocalePrefix,
} from "./routing";
import { SUPPORTED_LOCALES } from "./types";

describe("30 locale URL routing", () => {
  it("has 30 catalog locales and a matching prefix pattern", () => {
    expect(LANGUAGE_CODES).toHaveLength(30);
    expect(SUPPORTED_LOCALES).toHaveLength(30);
    for (const code of LANGUAGE_CODES) {
      expect(`/${code}/kategorie/`).toMatch(LOCALE_PREFIX_PATTERN);
    }
  });

  it("keeps language prefixes independent of country", () => {
    expect(stripLocalePrefix("/pl/products/").locale).toBe("pl");
    expect(localizePath("/products/", "pl")).toBe("/pl/products/");
    expect(localizePath("/products/", DEFAULT_LOCALE)).toBe("/products/");
    expect(localeLandingPath("ar")).toBe("/ar/");
  });

  it("emits hreflang for every catalog locale", () => {
    const alts = hreflangAlternates("/kategorie/textil/");
    expect(alts).toHaveLength(30);
    expect(alts.map((row) => row.locale).sort()).toEqual([...LANGUAGE_CODES].sort());
  });
});
