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
  });
});

describe("getLanguageBackground — Deutsch AND Deutschland", () => {
  it("DE + de => Germany background", () => {
    expect(getLanguageBackground("de", "DE")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("DE + de-DE => Germany background", () => {
    expect(getLanguageBackground("de-DE", "DE")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("IT + de => no Germany background", () => {
    expect(getLanguageBackground("de", "IT")).toBeNull();
  });

  it("FR + de => no Germany background", () => {
    expect(getLanguageBackground("de", "FR")).toBeNull();
  });

  it("TR + de => no Germany background", () => {
    expect(getLanguageBackground("de", "TR")).toBeNull();
  });

  it("AT + de => no Germany background", () => {
    expect(getLanguageBackground("de", "AT")).toBeNull();
  });

  it("CH + de => no Germany background", () => {
    expect(getLanguageBackground("de", "CH")).toBeNull();
  });

  it("DE + en => no Germany background", () => {
    expect(getLanguageBackground("en", "DE")).toBeNull();
  });

  it("DE + tr => no Germany background", () => {
    expect(getLanguageBackground("tr", "DE")).toBeNull();
  });

  it("locale only without country => no Germany background", () => {
    expect(getLanguageBackground("de")).toBeNull();
    expect(getLanguageBackground("de-DE")).toBeNull();
  });

  it("Italy + German then Germany + German => appears only after DE", () => {
    expect(getLanguageBackground("de", "IT")).toBeNull();
    expect(getLanguageBackground("de", "DE")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("Germany + German then English => removed", () => {
    expect(getLanguageBackground("de", "DE")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getLanguageBackground("en", "DE")).toBeNull();
  });
});
