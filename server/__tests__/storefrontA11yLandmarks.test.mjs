import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("storefront accessibility landmarks (established scope, not WCAG)", () => {
  it("keeps skip-link href bound to the main landmark id", () => {
    const landmarks = fs.readFileSync(path.join(root, "lib/a11y/landmarks.ts"), "utf8");
    const skip = fs.readFileSync(path.join(root, "components/SkipLink.tsx"), "utf8");
    const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
    const css = fs.readFileSync(path.join(root, "styles/globals.css"), "utf8");

    expect(landmarks).toContain('MAIN_CONTENT_ID = "maincontent"');
    expect(landmarks).toContain("SKIP_LINK_HREF");
    expect(skip).toContain("SKIP_LINK_HREF");
    expect(skip).toContain("SKIP_LINK_CLASS");
    expect(layout).toContain("MAIN_CONTENT_ID");
    expect(layout).toMatch(/<main id=\{MAIN_CONTENT_ID\}>/);
    expect(css).toContain(".skip-link:focus");
    expect(css).toContain("inset-inline-start: 16px");
  });
});
