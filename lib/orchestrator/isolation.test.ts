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
});
