import { describe, expect, it } from "vitest";
import {
  GERMANY_LANGUAGE_BACKGROUND,
  GERMANY_PHONE_BAND_BACKGROUND,
  getGermanyPhoneBandBackground,
  getLanguageBackground,
  normalizeLanguage,
} from "./languageBackgrounds";

describe("normalizeLanguage", () => {
  it("maps German locale variants to de", () => {
    expect(normalizeLanguage("de")).toBe("de");
    expect(normalizeLanguage("de-DE")).toBe("de");
    expect(normalizeLanguage("de-AT")).toBe("de");
    expect(normalizeLanguage("de-CH")).toBe("de");
  });
});

describe("getLanguageBackground — language only", () => {
  it("German locale shows Germany background regardless of country", () => {
    expect(getLanguageBackground("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getLanguageBackground("de-DE")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getLanguageBackground("de-AT")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getLanguageBackground("de-CH")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("non-German locales never use Germany background", () => {
    expect(getLanguageBackground("tr")).toBeNull();
    expect(getLanguageBackground("en")).toBeNull();
    expect(getLanguageBackground("ar")).toBeNull();
    expect(getLanguageBackground("it")).toBeNull();
  });
});

describe("getGermanyPhoneBandBackground — Germany market only", () => {
  it("shows the phone band only for the German market", () => {
    expect(getGermanyPhoneBandBackground("DE")).toBe(GERMANY_PHONE_BAND_BACKGROUND);
    expect(getGermanyPhoneBandBackground("de")).toBe(GERMANY_PHONE_BAND_BACKGROUND);
    expect(getGermanyPhoneBandBackground("TR")).toBeNull();
    expect(getGermanyPhoneBandBackground("FR")).toBeNull();
    expect(getGermanyPhoneBandBackground(null)).toBeNull();
  });
});
