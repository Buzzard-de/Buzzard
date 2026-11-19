import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runSandboxSession, combineOutfit } = require("../lib/storefront/textileSandbox.js");

describe("textile AI sandbox", () => {
  it("returns recommendations without live try-on", () => {
    const session = runSandboxSession({
      audience: "adult",
      occasion: "work",
      requestTryOn: true,
      consentPhoto: false,
    });
    expect(session.ok).toBe(true);
    expect(session.liveTryOn).toBe(false);
    expect(session.tryOn?.code).toBe("CONSENT_REQUIRED");
    expect(session.salesEnabled).toBe(false);
  });

  it("combines outfit lines from rules", () => {
    const outfit = combineOutfit({ occasion: "formal", pieces: ["sport"] });
    expect(outfit.ok).toBe(true);
    expect(outfit.lines).toContain("formal");
    expect(outfit.fitGuarantee).toBe(false);
  });
});