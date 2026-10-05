import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("orchestrator UI isolation", () => {
  const css = readFileSync(resolve(process.cwd(), "styles/orchestrator-voice.css"), "utf8");
  const shop = readFileSync(resolve(process.cwd(), "components/ShopProviders.tsx"), "utf8");
  const home = readFileSync(resolve(process.cwd(), "components/HomePageContent.tsx"), "utf8");

  it("does not rewrite the mobile homepage files", () => {
    expect(home).toContain("useIsMobileNav");
    expect(shop).toContain("VoiceControl");
    expect(shop).toContain("CallControl");
  });

  it("keeps voice/call CSS scoped", () => {
    expect(css.startsWith(".orch-voice-shell") || css.includes(".orch-voice-shell")).toBe(true);
    expect(css).not.toMatch(/^body\s*\{/m);
    expect(css).not.toContain(".buzzard-desktop-chrome");
  });

  it("keeps embodied office CSS off the homepage selectors", () => {
    const embodied = readFileSync(resolve(process.cwd(), "styles/embodied-office.css"), "utf8");
    expect(embodied).toContain(".pusat-office");
    expect(embodied).not.toContain(".buzzard-mobile-only");
    expect(embodied).not.toContain(".home-fullscreen");
  });
});
