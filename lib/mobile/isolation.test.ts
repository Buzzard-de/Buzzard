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

  it("hides desktop chrome inside the phone media query without a JS body class", () => {
    const phoneBlock = css.split("@media (max-width: 767px)")[1] ?? "";
    expect(phoneBlock).toContain(".buzzard-desktop-chrome");
    expect(phoneBlock).toContain("display: none !important");
    expect(phoneBlock).toContain("body.buzzard-admin-route .buzzard-desktop-chrome");
    expect(phoneBlock).toContain("body:has(.home-fullscreen)");
    expect(phoneBlock).toContain("height: auto !important");
  });

  it("reconstructs compact category rows and keeps the assistant above the tab bar", () => {
    const phoneBlock = css.split("@media (max-width: 767px)")[1] ?? "";
    expect(phoneBlock).toContain(".buzzard-mobile-category-row-icon");
    expect(phoneBlock).toContain(".buzzard-mobile-trust");
    expect(phoneBlock).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(phoneBlock).toContain(".buzzard-mobile-category-hero");
    expect(phoneBlock).toContain(".buzzard-mobile-category-thumb");
    expect(phoneBlock).toContain(".ai-chat-fab");
    expect(phoneBlock).toContain("safe-area-inset-bottom");
    expect(phoneBlock).toContain("body.buzzard-phone-storefront");
    expect(phoneBlock).toContain("a.buzzard-mobile-product-title");
    expect(phoneBlock).toContain("background-size: cover");
    expect(phoneBlock).toContain(".buzzard-mobile-hero");
    expect(phoneBlock).toContain(".subpage-content.products-page-layout.buzzard-desktop-chrome");
  });
});
