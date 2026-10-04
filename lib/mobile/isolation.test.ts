import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("buzzard mobile CSS isolation", () => {
  const css = readFileSync(resolve(process.cwd(), "styles/buzzard-mobile.css"), "utf8");

  it("keeps phone styles inside max-width 767px", () => {
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).not.toContain("@media (min-width: 768px)");
    expect(css).not.toContain("@media (min-width: 1024px)");
  });

  it("hides the phone shell by default so tablet/desktop stay unchanged", () => {
    const beforeMedia = css.split("@media (max-width: 767px)")[0];
    expect(beforeMedia).toContain(".buzzard-mobile-only");
    expect(beforeMedia).toContain("display: none");
    expect(beforeMedia).not.toContain(".buzzard-desktop-chrome");
  });

  it("only hides desktop chrome inside the phone media query", () => {
    const phoneBlock = css.split("@media (max-width: 767px)")[1] ?? "";
    expect(phoneBlock).toContain("body.buzzard-phone-storefront .buzzard-desktop-chrome");
    expect(phoneBlock).toContain("display: none !important");
  });
});
