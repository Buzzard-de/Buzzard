import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { evaluateBrowserConnect, isRebindLookalike } = require("../../lib/security/browserConnect.js");

describe("browser connect policy for the local admin API", () => {
  it.each([
    "http://127.0.0.1:3001/api/admin/login",
    "http://127.0.0.1:3011/api/admin/me",
    "http://127.0.0.1/api/health",
    "http://localhost:3001/api/admin/login",
  ])("allows %s as local development", (url) => {
    expect(evaluateBrowserConnect(url)).toMatchObject({ allowed: true, code: "LOCAL_DEV" });
  });

  it.each([
    "http://127.0.0.1.nip.io/api/admin/login",
    "http://127.0.0.1.evil.example/api/admin/login",
    "http://evil-127.0.0.1.example/api/admin/login",
    "http://a.127.0.0.1.sslip.io/",
    "http://localhost.evil.example/api/admin/login",
    "http://app.localtest.me/",
    "http://169.254.169.254/latest/meta-data/",
  ])("denies the rebinding lookalike %s", (url) => {
    expect(evaluateBrowserConnect(url)).toMatchObject({ allowed: false, code: "BROWSER_REBIND_DENIED" });
  });

  it.each(["http://127.0.0.2:3001/", "http://0.0.0.0:3001/", "http://[::1]:3001/", "http://10.0.0.5/", "http://192.168.1.10/"])(
    "denies the other local address %s",
    (url) => {
      expect(evaluateBrowserConnect(url).allowed).toBe(false);
    }
  );

  it("treats only names that embed the loopback literal as lookalikes", () => {
    expect(isRebindLookalike("127.0.0.1")).toBe(false);
    expect(isRebindLookalike("127.0.0.1.nip.io")).toBe(true);
    expect(isRebindLookalike("x127.0.0.1")).toBe(false);
    expect(isRebindLookalike("x.127.0.0.1")).toBe(true);
  });

  it("keeps the TypeScript policy used by the browser in step with the CommonJS twin", () => {
    const source = readFileSync(new URL("../../lib/security/browserConnect.ts", import.meta.url), "utf8");
    expect(source).toContain('const LOOPBACK_LITERAL = "127.0.0.1";');
    expect(source).toContain("(h !== LOOPBACK_LITERAL && /\\b127\\.0\\.0\\.1\\b/.test(h))");
  });
});
