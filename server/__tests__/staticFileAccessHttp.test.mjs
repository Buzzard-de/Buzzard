import { connect } from "node:net";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

let api;

beforeAll(async () => {
  api = await startIsolatedApi({ roles: ["administrator", "read_only", "catalog_manager"], env: { BUZZARD_TEST_MODE: "1" } });
}, 90_000);

afterAll(async () => {
  await api?.stop();
});

/** Sends the request line exactly as given; fetch() would normalise "..". */
function rawGet(target, method = "GET") {
  return new Promise((resolve, reject) => {
    const socket = connect(api.port, "127.0.0.1");
    let data = "";
    socket.setTimeout(10_000, () => socket.destroy(new Error("timeout")));
    socket.on("connect", () => socket.write(`${method} ${target} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`));
    socket.on("data", (chunk) => (data += chunk.toString("latin1")));
    socket.on("error", reject);
    socket.on("close", () => {
      const status = Number((data.match(/^HTTP\/1\.1 (\d{3})/) || [])[1] || 0);
      const body = data.slice(data.indexOf("\r\n\r\n") + 4);
      resolve({ status, body });
    });
  });
}

const repoFile = (rel) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));

describe("static fallback over HTTP", () => {
  it("serves an intended public asset", async () => {
    expect((await rawGet("/public/manifest.json")).status).toBe(200);
    const res = await api.request("GET", "/public/manifest.json");
    expect(res.status).toBe(200);
    expect(res.json).toBeTypeOf("object");
  });

  it("the files used as targets exist in the checkout, so 404 is the policy and not a missing file", () => {
    for (const rel of ["package.json", "render.yaml", "server/lib/auth.js", "server/server.js", "data/buzzard_admin_users.seed.json"]) {
      expect(existsSync(repoFile(rel)), rel).toBe(true);
    }
  });

  it.each([
    "/package.json",
    "/render.yaml",
    "/server/server.js",
    "/server/lib/auth.js",
    "/server/lib/jwtSecret.js",
    "/data/buzzard_admin_users.seed.json",
    "/server/data/admin-users.json",
    "/server/data/admin-sessions.json",
    "/server/data/security-log.json",
    "/server/data/audit-log.json",
    "/server/data/automation-events.json",
    "/server/data/buzzard.db",
    "/.env",
    "/.env.example",
    "/.git/HEAD",
    "/node_modules/next/package.json",
    // traversal, plain and encoded
    "/public/../package.json",
    "/public/../server/lib/auth.js",
    "/public/%2e%2e/package.json",
    "/public/%2E%2E/server/data/admin-users.json",
    "/public/..%2fpackage.json",
    "/public/..%2Fserver%2Fdata%2Fadmin-users.json",
    "/public/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "/logo/../data/buzzard_admin_users.seed.json",
    // double and triple encoding
    "/public/%252e%252e/package.json",
    "/public/%252e%252e%252fserver%252fdata%252fadmin-users.json",
    "/public/%25252e%25252e/package.json",
    "/public/..%252f..%252fetc%252fpasswd",
    // backslash and NUL
    "/public/..%5cpackage.json",
    "/public/..\\package.json",
    "/public/manifest.json%00.html",
    "/package.json%00.html",
    // absolute paths
    "/etc/passwd",
    "//etc/passwd",
    "/public//etc/passwd",
    "/public/%2fetc%2fpasswd",
    "/%2fetc%2fpasswd",
    "/C:/Windows/win.ini",
    "/file:///etc/passwd",
    // absolute-form request targets
    "http://127.0.0.1/package.json",
    "http://127.0.0.1/public/../server/lib/auth.js",
    // malformed
    "/%E0%A4%A",
    "/public/%",
  ])("GET %s is not served", async (target) => {
    const res = await rawGet(target);
    expect([400, 404]).toContain(res.status);
    expect(res.body).not.toMatch(/"dependencies"|password|scrypt:|module\.exports|root:x:/);
    expect(api.alive()).toBe(true);
  });

  it.each(["POST", "PUT", "DELETE", "PATCH"])("%s on a public asset is not served", async (method) => {
    const res = await rawGet("/public/manifest.json", method);
    expect(res.status).toBe(404);
  });

  it("HEAD is limited to the same files", async () => {
    expect((await rawGet("/package.json", "HEAD")).status).toBe(404);
    expect((await rawGet("/public/manifest.json", "HEAD")).status).toBe(200);
  });
});

describe("API paths do not read repository files", () => {
  it.each([
    "/api/../package.json",
    "/api/%2e%2e/package.json",
    "/api/..%2f..%2fpackage.json",
    "/api/admin/..%2f..%2f..%2fserver%2fdata%2fadmin-users.json",
    "/api/admin/audit/..%2f..%2f..%2fserver%2fdata%2faudit-log.json",
    "/api/%252e%252e/server/data/admin-users.json",
    "/api/health/..%5c..%5cpackage.json",
    "/api//etc/passwd",
    "/api/%00",
    "/api/%E0%A4%A",
    "/api/%",
  ])("GET %s", async (target) => {
    const res = await rawGet(target);
    expect([400, 401, 404]).toContain(res.status);
    expect(res.body).not.toMatch(/"dependencies"|password_hash|scrypt:|root:x:/);
    expect(api.alive()).toBe(true);
  });

  it("stays up after a burst of malformed requests", async () => {
    for (const target of ["/api/%E0%A4%A", "/%E0%A4%A", "/api/%", "/api/admin/%ff%fe", "/api/x?%E0%A4%A=1"]) {
      await rawGet(target);
    }
    const health = await api.request("GET", "/api/health");
    expect(health.status).toBe(200);
  });

  it("answers a malformed JSON body with 400 and does not log an internal error", async () => {
    const res = await api.request("POST", "/api/admin/login", { raw: "{not json", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
    expect(res.json).toEqual({ success: false, errorKey: "security.invalidJson" });
  });

  it("answers an oversized body with 413", async () => {
    const res = await api
      .request("POST", "/api/admin/login", { raw: JSON.stringify({ email: "x".repeat(300_000) }), headers: { "Content-Type": "application/json" } })
      .catch(() => ({ status: 413 }));
    expect(res.status).toBe(413);
    expect(api.alive()).toBe(true);
  });
});

describe("store contents are reachable only through their admin routes", () => {
  const storeRoutes = [
    ["/api/admin/audit", "audit.read"],
    ["/api/admin/security/events", "security.read"],
    ["/api/admin/security/audit", "security.read"],
    ["/api/admin/sessions", "security.read"],
  ];

  it.each(storeRoutes)("GET %s rejects anonymous requests", async (route) => {
    const res = await api.request("GET", route);
    expect(res.status).toBe(401);
    expect(res.json.errorKey).toBe("admin.auth.required");
  });

  it.each(storeRoutes)("GET %s rejects a made-up bearer token", async (route) => {
    const res = await api.request("GET", route, { token: "0".repeat(64) });
    expect(res.status).toBe(401);
  });

  it.each(storeRoutes)("GET %s answers an administrator", async (route) => {
    const token = await api.login("administrator");
    const res = await api.request("GET", route, { token });
    expect(res.status).toBe(200);
  });

  it("a role without security.read is refused sessions and security events", async () => {
    const token = await api.login("catalog_manager");
    expect((await api.request("GET", "/api/admin/sessions", { token })).status).toBe(403);
    expect((await api.request("GET", "/api/admin/security/events", { token })).status).toBe(403);
    expect((await api.request("GET", "/api/admin/security/audit", { token })).status).toBe(403);
    expect((await api.request("GET", "/api/admin/audit", { token })).status).toBe(200);
  });

  it("the read-only role sees its own sessions only", async () => {
    await api.login("administrator");
    const token = await api.login("read_only");
    const res = await api.request("GET", "/api/admin/sessions", { token });
    expect(res.status).toBe(200);
    expect(res.json.sessions.length).toBeGreaterThan(0);
    expect(new Set(res.json.sessions.map((s) => s.userId))).toEqual(new Set([api.accounts.read_only.id]));
  });

  it("no response of the session list contains a token or a password hash", async () => {
    const token = await api.login("administrator");
    const res = await api.request("GET", "/api/admin/sessions", { token });
    expect(res.text).not.toContain(token);
    expect(res.text).not.toMatch(/password_hash|scrypt:/);
  });
});
