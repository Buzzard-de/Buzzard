import { describe, expect, it } from "vitest";
import {
  GERMANY_LANGUAGE_BACKGROUND,
  getLanguageBackground,
  normalizeLanguage,
} from "./languageBackgrounds";

describe("normalizeLanguage", () => {
  it("maps German locale variants to de", () => {
    expect(normalizeLanguage("de")).toBe("de");
    expect(normalizeLanguage("de-DE")).toBe("de");
    expect(normalizeLanguage("de-AT")).toBe("de");
    expect(normalizeLanguage("de-CH")).toBe("de");
    expect(normalizeLanguage("de-LU")).toBe("de");
    expect(normalizeLanguage("de-LI")).toBe("de");
    expect(normalizeLanguage("DE-de")).toBe("de");
    expect(normalizeLanguage("de_DE")).toBe("de");
  });

  it("keeps non-German languages distinct", () => {
    expect(normalizeLanguage("tr")).toBe("tr");
    expect(normalizeLanguage("en-GB")).toBe("en");
    expect(normalizeLanguage("it")).toBe("it");
    expect(normalizeLanguage("fr-FR")).toBe("fr");
    expect(normalizeLanguage("es")).toBe("es");
    expect(normalizeLanguage("ar")).toBe("ar");
  });
});

describe("getLanguageBackground — language only, never country", () => {
  it("TEST 1: country DE + language de => Germany background", () => {
    const country = "DE";
    const language = "de";
    void country;
    expect(getLanguageBackground(language)).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 2: country IT + language de => Germany background", () => {
    const country = "IT";
    void country;
    expect(getLanguageBackground("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 3: country FR + language de => Germany background", () => {
    const country = "FR";
    void country;
    expect(getLanguageBackground("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 4: country TR + language de => Germany background", () => {
    const country = "TR";
    void country;
    expect(getLanguageBackground("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 5: country AT + language de => Germany background", () => {
    const country = "AT";
    void country;
    expect(getLanguageBackground("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 6: country CH + language de => Germany background", () => {
    const country = "CH";
    void country;
    expect(getLanguageBackground("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 7: country DE + language tr => no Germany background", () => {
    const country = "DE";
    void country;
    expect(getLanguageBackground("tr")).toBeNull();
  });

  it("TEST 8: country IT + language it => no Germany background", () => {
    const country = "IT";
    void country;
    expect(getLanguageBackground("it")).toBeNull();
  });

  it("TEST 9: country FR + language fr => no Germany background", () => {
    const country = "FR";
    void country;
    expect(getLanguageBackground("fr")).toBeNull();
  });

  it("TEST 10: country TR + language tr => no Germany background", () => {
    const country = "TR";
    void country;
    expect(getLanguageBackground("tr")).toBeNull();
  });

  it("TEST 11: locale de-DE => Germany background", () => {
    expect(getLanguageBackground("de-DE")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 12: locale de-AT => Germany background", () => {
    expect(getLanguageBackground("de-AT")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 13: locale de-CH => Germany background", () => {
    expect(getLanguageBackground("de-CH")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 14: Italy + Italian then manual German => Germany background", () => {
    const country = "IT";
    let language = "it";
    void country;
    expect(getLanguageBackground(language)).toBeNull();
    language = "de";
    expect(getLanguageBackground(language)).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("TEST 15: Italy + German then manual Italian => Germany background removed", () => {
    const country = "IT";
    let language = "de";
    void country;
    expect(getLanguageBackground(language)).toBe(GERMANY_LANGUAGE_BACKGROUND);
    language = "it";
    expect(getLanguageBackground(language)).toBeNull();
  });

  it("does not fall back to Germany for unknown locales", () => {
    expect(getLanguageBackground("en")).toBeNull();
    expect(getLanguageBackground("uk")).toBeNull();
    expect(getLanguageBackground("")).toBeNull();
    expect(getLanguageBackground(null)).toBeNull();
    expect(getLanguageBackground(undefined)).toBeNull();
  });

  it("selector function does not accept a country argument", () => {
    expect(getLanguageBackground.length).toBe(1);
  });
});
