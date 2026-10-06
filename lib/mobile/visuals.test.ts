import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GERMANY_LANGUAGE_BACKGROUND,
  getLanguageBackground,
} from "@/lib/backgrounds/languageBackgrounds";
import { getMobileCoverStyle, getMobileHeroPhoto, getMobileHeroStyle } from "./visuals";

describe("mobile Germany hero is locale-scoped", () => {
  it("uses the Germany background asset only for German locales", () => {
    expect(getMobileHeroPhoto("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getMobileHeroPhoto("de-DE")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getMobileHeroPhoto("de-AT")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getMobileHeroPhoto("de-CH")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getLanguageBackground("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("does not apply the Germany image to non-German locales", () => {
    expect(getMobileHeroPhoto("tr")).toBeNull();
    expect(getMobileHeroPhoto("en")).toBeNull();
    expect(getMobileHeroPhoto("ar")).toBeNull();
    expect(getLanguageBackground("tr")).toBeNull();
    expect(getLanguageBackground("en")).toBeNull();
    expect(getLanguageBackground("ar")).toBeNull();
  });

  it("does not stamp the Germany image onto category-card covers", () => {
    const style = getMobileCoverStyle("cat-05", null);
    expect(style.backgroundImage ?? "").not.toContain(GERMANY_LANGUAGE_BACKGROUND);
    expect(getMobileHeroStyle("tr")).toBeUndefined();
    expect(getMobileHeroStyle("de")?.backgroundImage).toContain(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("ships the Germany background file at the language-background path", () => {
    const diskPath = resolve(process.cwd(), "public", GERMANY_LANGUAGE_BACKGROUND.replace(/^\//, ""));
    expect(existsSync(diskPath)).toBe(true);
  });
});
