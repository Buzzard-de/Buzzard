import { describe, expect, it } from "vitest";
import { GERMANY_LANGUAGE_BACKGROUND } from "@/lib/backgrounds/languageBackgrounds";
import { getMobileCoverStyle, getMobileStorefrontPhoto } from "./visuals";

describe("mobile storefront visuals", () => {
  it("uses the German language background for de and the existing asset otherwise", () => {
    expect(getMobileStorefrontPhoto("de")).toBe(GERMANY_LANGUAGE_BACKGROUND);
    expect(getMobileStorefrontPhoto("tr")).toBe(GERMANY_LANGUAGE_BACKGROUND);
  });

  it("derives a cover style from live category ids without inventing a tree", () => {
    const style = getMobileCoverStyle("cat-05", "de");
    expect(style.backgroundImage).toContain(GERMANY_LANGUAGE_BACKGROUND);
    expect(style.backgroundPosition).toMatch(/^\d+% center$/);
  });
});
