import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { resolvePublicFile } = require("../lib/staticFilePolicy.js");

let root;

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), "buzzard-static-"));
  const files = {
    "index.html": "<html>",
    "google-verification.html": "ok",
    "package.json": "{}",
    ".env": "SECRET=1",
    "render.yaml": "x",
    "public/manifest.json": "{}",
    "public/images/a.png": "png",
    "public/council/index.html": "<html>",
    "public/.hidden": "x",
    "logo/logo.png": "png",
    "styles/admin.css": "body{}",
    "server/data/admin-sessions.json": "[]",
    "server/data/admin-users.json": "[]",
    "server/data/security-log.json": "[]",
    "server/data/audit-log.json": "[]",
    "server/data/automation-events.json": "[]",
    "server/data/buzzard.db": "sqlite",
    "server/lib/auth.js": "x",
    "data/buzzard_admin_users.seed.json": "[]",
    ".git/config": "x",
  };
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), content);
  }
  symlinkSync(path.join(root, "server", "data", "admin-users.json"), path.join(root, "public", "leak.json"));
  symlinkSync(path.join(root, "server", "data"), path.join(root, "public", "leakdir"));
  symlinkSync(root, path.join(root, "logo", "up"));
  symlinkSync("/etc/hostname", path.join(root, "logo", "abs"));
});

describe("static file policy", () => {
  it("resolves a symlinked root without serving anything outside the public directories", () => {
    const link = path.join(tmpdir(), `buzzard-static-link-${process.pid}`);
    try {
      symlinkSync(root, link);
    } catch {
      /* exists from an earlier run */
    }
    expect(resolvePublicFile(link, "/public/manifest.json")).toBe(path.join(root, "public/manifest.json"));
    expect(resolvePublicFile(link, "/server/data/admin-users.json")).toBeNull();
    expect(resolvePublicFile(link, "/public/leak.json")).toBeNull();
  });

  it("does not follow a symlink inside a public directory that points at another public directory's parent", () => {
    expect(resolvePublicFile(root, "/logo/up/server/data/admin-users.json")).toBeNull();
    expect(resolvePublicFile(root, "/logo/abs")).toBeNull();
  });

  it.each([
    ["/", "index.html"],
    ["/index.html", "index.html"],
    ["/google-verification.html", "google-verification.html"],
    ["/public/manifest.json", "public/manifest.json"],
    ["/public/images/a.png", "public/images/a.png"],
    ["/public/council", "public/council/index.html"],
    ["/public/council/", "public/council/index.html"],
    ["/logo/logo.png", "logo/logo.png"],
    ["/styles/admin.css", "styles/admin.css"],
  ])("serves %s", (request, file) => {
    expect(resolvePublicFile(root, request)).toBe(path.join(root, file));
  });

  it.each([
    "/server/data/admin-sessions.json",
    "/server/data/admin-users.json",
    "/server/data/security-log.json",
    "/server/data/audit-log.json",
    "/server/data/automation-events.json",
    "/server/data/buzzard.db",
    "/server/lib/auth.js",
    "/data/buzzard_admin_users.seed.json",
    "/package.json",
    "/render.yaml",
    "/.env",
    "/.git/config",
    "/public/.hidden",
    "/public/../server/data/admin-users.json",
    "/public/%2e%2e/server/data/admin-users.json",
    "/public/..%2fserver/data/admin-users.json",
    "/public/%2e%2e%2f%2e%2e%2fetc/passwd",
    "/public\\..\\server\\data\\admin-users.json",
    "/public/leak.json",
    "/public/leakdir/admin-users.json",
    "//server/data/admin-users.json",
    "/public/%252e%252e/server/data/admin-users.json",
    "/public/%252e%252e%252fserver%252fdata%252fadmin-users.json",
    "/%252e%252e/%252e%252e/etc/passwd",
    "/public/%25252e%25252e/server/data/admin-users.json",
    "/public/..%252f..%252fetc%252fpasswd",
    "/public/..%5c..%5cserver%5cdata%5cadmin-users.json",
    "/public/%2e%2e%5cserver%5cdata%5cadmin-users.json",
    "/etc/passwd",
    "//etc/passwd",
    "/public//etc/passwd",
    "/public/%2fetc%2fpasswd",
    "/C:/Windows/win.ini",
    "/public/C:%5cWindows%5cwin.ini",
    "/file:///etc/passwd",
    "/public/....//....//server/data/admin-users.json",
    "/public/images/../../server/data/admin-sessions.json",
    "/public/images/..%2f..%2fserver/data/security-log.json",
    "/logo/../server/data/audit-log.json",
    "/styles/../server/data/automation-events.json",
    "/styles/../server/data/buzzard.db",
    "/public/../data/buzzard_admin_users.seed.json",
    "/server/data/admin-users.json.bak",
    "/server/data/admin-users.json%00.html",
    "/index.html/../server/data/admin-users.json",
    "/index.html%00.json",
    "/.html",
    "/-x.html",
    "/server.html/../package.json",
    "/public/missing.png",
    "/public/%00",
    "/%E0%A4%A",
    "/server",
    "/public",
  ])("does not serve %s", (request) => {
    expect(resolvePublicFile(root, request)).toBeNull();
  });
});
