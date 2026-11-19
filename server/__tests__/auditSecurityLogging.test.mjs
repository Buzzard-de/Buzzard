import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fakeRequest, freshServerLib, tempDataDir } from "./support/freshServerLib.mjs";
import { ALL_ROLES, startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

/**
 * What the audit log and the security log record, and what they must never
 * contain. Real server process, synthetic accounts and synthetic customers.
 */

const WRITE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function loadInventory() {
  const root = tempDataDir("inventory");
  const out = path.join(root, "routes.json");
  execFileSync(process.execPath, [fileURLToPath(new URL("./support/routeInventory.cjs", import.meta.url)), out], {
    env: { ...process.env, BUZZARD_DATA_DIR: path.join(root, "data"), BUZZARD_DB_PATH: path.join(root, "catalog.sqlite"), NODE_ENV: "test" },
    stdio: "ignore",
  });
  return JSON.parse(readFileSync(out, "utf8"));
}

describe("audit and security log over HTTP", () => {
  let api;
  let inventory;
  const tokens = {};
  const secrets = new Set();

  const audit = () => api.readStore("audit-log.json");
  const security = () => api.readStore("security-log.json");
  const byRequest = (entries, res) => entries.filter((entry) => entry.requestId === res.headers.get("x-request-id"));

  async function signIn(role) {
    tokens[role] = await api.login(role);
    secrets.add(tokens[role]);
    return tokens[role];
  }

  beforeAll(async () => {
    inventory = loadInventory();
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1", BUZZARD_TRUSTED_PROXY_HOPS: "0" } });
    for (const account of Object.values(api.accounts)) secrets.add(account.password);
    for (const role of ALL_ROLES) await signIn(role);
  }, 120_000);
  afterAll(async () => api?.stop());

  describe("back-office writes", () => {
    it("records every guarded write route once, with actor, action, result and request id", async () => {
      const routes = inventory.filter((route) => WRITE.has(route.method) && route.policy && !route.policy.public && !route.policy.webhook);
      expect(routes.length).toBeGreaterThan(200);
      const missing = [];
      const wrong = [];
      for (const route of routes) {
        const url = route.path.replace(/:[A-Za-z0-9_]+/g, "1");
        let res = await api.request(route.method, url, { token: tokens.administrator, body: {} });
        if (res.status === 401) {
          // The route ended the session it was called with (sign-out everywhere, password change).
          await signIn("administrator");
          res = await api.request(route.method, url, { token: tokens.administrator, body: {} });
        }
        // A handler may add its own, more specific entry; the request-level one exists exactly once.
        const entries = byRequest(audit(), res).filter(
          (candidate) => candidate.action === `${route.method} ${route.path}` || candidate.action.startsWith("ai_center.")
        );
        if (entries.length !== 1) {
          missing.push(`${route.method} ${route.path} → ${res.status}, ${entries.length} entries`);
          continue;
        }
        const [entry] = entries;
        const fine =
          entry.userId === "usr-synthetic-administrator" &&
          entry.role === "administrator" &&
          typeof entry.result === "string" &&
          entry.result.length > 0 &&
          ISO_UTC.test(entry.timestamp) &&
          entry.correlationId === res.headers.get("x-correlation-id") &&
          /^[0-9a-f]{64}$/.test(entry.hash);
        if (!fine) wrong.push(`${route.method} ${route.path}: ${JSON.stringify({ action: entry.action, userId: entry.userId, result: entry.result })}`);
        // 503 is a deliberate answer of switched-off modules (Pusat dispatch); 500 would be a crash.
        if (res.status === 500) wrong.push(`${route.method} ${route.path} answered ${res.status}`);
        if (res.status === 503 && entry.result !== "error") wrong.push(`${route.method} ${route.path}: 503 recorded as ${entry.result}`);
      }
      expect(missing, missing.slice(0, 10).join("\n")).toEqual([]);
      expect(wrong, wrong.slice(0, 10).join("\n")).toEqual([]);
      expect(api.alive()).toBe(true);
      await signIn("administrator");
    }, 300_000);

    it("maps the answer to the result", async () => {
      const cases = [
        ["PATCH", "/api/admin/users/usr-synthetic-staff/role", { role: "staff" }, tokens.administrator, 200, "success"],
        ["PATCH", "/api/admin/users/usr-does-not-exist/role", { role: "staff" }, tokens.administrator, 404, "rejected"],
        ["PATCH", "/api/admin/users/usr-synthetic-staff/role", { role: "owner" }, tokens.administrator, 400, "rejected"],
      ];
      for (const [method, route, body, token, status, result] of cases) {
        const res = await api.request(method, route, { token, body });
        expect(res.status, route).toBe(status);
        const entry = byRequest(audit(), res).find((candidate) => candidate.action.startsWith(method));
        expect(entry, route).toMatchObject({ action: "PATCH /api/admin/users/:userId/role", entityType: "route", result, metadata: { kind: "write", status, permission: "users.write" } });
        expect(entry.entityId).toBe(route.split("/")[4]);
      }
    });

    it("records a refused write with the role that tried", async () => {
      for (const role of ["read_only", "staff", "catalog_manager"]) {
        const res = await api.request("PATCH", "/api/admin/users/usr-synthetic-admin/role", { token: tokens[role], body: { role: "administrator" } });
        expect(res.status).toBe(403);
        const [entry] = byRequest(audit(), res);
        expect(entry).toMatchObject({ action: "PATCH /api/admin/users/:userId/role", result: "denied", role, userId: `usr-synthetic-${role.replace(/_/g, "-")}`, metadata: { status: 403 } });
        const event = byRequest(security(), res).find((candidate) => candidate.type === "permission_denied" || candidate.type === "privilege_escalation_attempt");
        expect(event, role).toBeTruthy();
        expect(event.success).toBe(false);
        expect(event.correlationId).toBe(entry.correlationId);
      }
    });

    it("never stores what was sent", async () => {
      const marker = `marker-${randomBytes(6).toString("hex")}`;
      const res = await api.request("POST", "/api/admin/account/password", {
        token: tokens.staff,
        body: { currentPassword: `wrong-${marker}`, newPassword: `New-${marker}-Value-1`, note: marker },
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(byRequest(audit(), res)).toHaveLength(1);
      expect(JSON.stringify(audit())).not.toContain(marker);
      expect(JSON.stringify(security())).not.toContain(marker);
      expect(api.output()).not.toContain(marker);
    });

    it("writes nothing for a caller without a session, who has no identity to record", async () => {
      const before = audit().length;
      const res = await api.request("PATCH", "/api/admin/users/usr-synthetic-admin/role", { body: { role: "administrator" } });
      expect(res.status).toBe(401);
      expect(audit()).toHaveLength(before);
      expect(byRequest(security(), res).map((entry) => entry.type)).toContain("admin_auth_required");
    });
  });

  describe("account changes", () => {
    it("a role change is recorded with the old and the new role, by whom and for whom", async () => {
      const res = await api.request("PATCH", "/api/admin/users/usr-synthetic-staff/role", { token: tokens.administrator, body: { role: "catalog_manager" } });
      expect(res.status).toBe(200);
      const entries = byRequest(audit(), res);
      const change = entries.find((entry) => entry.action === "admin.user.role_change");
      expect(change).toMatchObject({
        userId: "usr-synthetic-administrator",
        role: "administrator",
        entityType: "admin_user",
        entityId: "usr-synthetic-staff",
        field: "role",
        oldValue: "staff",
        newValue: "catalog_manager",
        result: "success",
      });
      expect(entries.find((entry) => entry.action === "PATCH /api/admin/users/:userId/role")).toBeTruthy();
      const events = byRequest(security(), res).map((entry) => entry.type);
      expect(events).toEqual(expect.arrayContaining(["admin_role_changed", "session_revoked"]));
      await api.request("PATCH", "/api/admin/users/usr-synthetic-staff/role", { token: tokens.administrator, body: { role: "staff" } });
      await signIn("staff");
    });

    it("a password change is recorded without either password", async () => {
      const account = api.accounts.order_manager;
      const next = `Unit-${randomBytes(12).toString("base64url")}-7q`;
      secrets.add(next);
      const res = await api.request("POST", "/api/admin/account/password", { token: tokens.order_manager, body: { currentPassword: account.password, newPassword: next } });
      expect(res.status).toBe(200);
      secrets.add(res.json.token);
      const change = byRequest(audit(), res).find((entry) => entry.action === "admin.account.password_change");
      expect(change).toMatchObject({ userId: account.id, field: "password", oldValue: null, newValue: null, result: "success" });
      expect(byRequest(security(), res).map((entry) => entry.type)).toEqual(expect.arrayContaining(["admin_password_changed", "session_revoked"]));
      account.password = next;
      await signIn("order_manager");
    });
  });

  describe("sensitive reads", () => {
    it("records who looked at accounts and at the logs, once a minute per reader and route", async () => {
      for (const route of ["/api/admin/users", "/api/admin/security/events", "/api/admin/security/stores"]) {
        const first = await api.request("GET", route, { token: tokens.admin });
        expect(first.status, route).toBe(200);
        const [entry] = byRequest(audit(), first);
        expect(entry, route).toMatchObject({ action: `GET ${route}`, userId: "usr-synthetic-admin", result: "success", metadata: { kind: "read" } });
        const second = await api.request("GET", route, { token: tokens.admin });
        expect(byRequest(audit(), second), route).toHaveLength(0);
      }
    });

    it("does not record ordinary reads", async () => {
      const before = audit().length;
      const res = await api.request("GET", "/api/admin/me", { token: tokens.admin });
      expect(res.status).toBe(200);
      expect(audit()).toHaveLength(before);
    });
  });

  describe("security events", () => {
    it("records sign-in, failed sign-in, sign-out and a foreign token with address, time and request id", async () => {
      const account = api.accounts.ai_agent;
      const failed = await api.request("POST", "/api/admin/login", { body: { email: account.email, password: "wrong-value-1" } });
      const ok = await api.request("POST", "/api/admin/login", { body: { email: account.email, password: account.password } });
      secrets.add(ok.json.token);
      const out = await api.request("POST", "/api/admin/logout", { token: ok.json.token });
      const stale = await api.request("GET", "/api/admin/me", { token: ok.json.token });
      expect([failed.status, ok.status, out.status, stale.status]).toEqual([401, 200, 200, 401]);

      const expectEvent = (res, type, extra = {}) => {
        const event = byRequest(security(), res).find((entry) => entry.type === type);
        expect(event, type).toBeTruthy();
        expect(event).toMatchObject({ ip: "127.0.0.1", ...extra });
        expect(event.timestamp).toMatch(ISO_UTC);
        expect(event.correlationId).toBe(res.headers.get("x-correlation-id"));
        expect(event.severity).toMatch(/^(INFO|WARNING|HIGH|CRITICAL)$/);
        return event;
      };
      const failure = expectEvent(failed, "admin_login_failed", { success: false, path: "/api/admin/login" });
      expect(failure.email).toBe("sy***@unit.buzzard.test");
      expectEvent(ok, "admin_login", { success: true, userId: account.id, role: "ai_agent" });
      expectEvent(out, "admin_logout", { success: true, userId: account.id });
      expectEvent(stale, "admin_auth_required", { success: false });
    });

    it("takes the address from the connection, not from a header the client wrote", async () => {
      const res = await api.request("POST", "/api/admin/login", {
        body: { email: "nobody@unit.buzzard.test", password: "wrong-value-1" },
        headers: { "X-Forwarded-For": "203.0.113.77, 198.51.100.1", "X-Real-IP": "203.0.113.78" },
      });
      const [event] = byRequest(security(), res);
      expect(event.ip).toBe("127.0.0.1");
      expect(JSON.stringify(event)).not.toContain("203.0.113");
      const write = await api.request("PATCH", "/api/admin/users/usr-nobody/role", { token: tokens.administrator, body: { role: "staff" }, headers: { "X-Forwarded-For": "203.0.113.77" } });
      expect(byRequest(audit(), write)[0].ip).toBe("127.0.0.1");
    });

    it("keeps a caller's correlation id when it is well-formed and replaces it when it is not", async () => {
      const good = await api.request("GET", "/api/admin/users", { token: tokens.read_only, headers: { "X-Correlation-Id": "trace-2026-11-18_abc.1" } });
      expect(byRequest(audit(), good)[0].correlationId).toBe("trace-2026-11-18_abc.1");
      const bad = await api.request("PATCH", "/api/admin/users/usr-nobody/role", {
        token: tokens.administrator,
        body: { role: "staff" },
        headers: { "X-Correlation-Id": '"><script>alert(1)</script>', "X-Request-Id": "a b\tc" },
      });
      const [entry] = byRequest(audit(), bad);
      expect(entry.correlationId).toMatch(/^corr_[0-9a-f]{16}$/);
      expect(entry.requestId).toMatch(/^req_[0-9a-f]{16}$/);
      expect(JSON.stringify(audit())).not.toContain("<script>");
    });

    it("writes one line per event with a consistent time format, in order", () => {
      for (const [name, key] of [["audit-log.json", "timestamp"], ["security-log.json", "timestamp"]]) {
        const entries = api.readStore(name);
        expect(entries.length, name).toBeGreaterThan(30);
        for (const entry of entries) expect(entry[key], name).toMatch(ISO_UTC);
        const times = entries.map((entry) => Date.parse(entry[key]));
        expect(times.every((time, index) => index === 0 || time >= times[index - 1]), name).toBe(true);
        expect(new Set(entries.map((entry) => entry.id)).size, name).toBe(entries.length);
      }
    });
  });

  describe("customer data", () => {
    it("customer activity is recorded by id, without address, name or what was typed", async () => {
      const marker = randomBytes(5).toString("hex");
      const email = `kunde-${marker}@synthetic.invalid`;
      const password = `Kunde-${marker}-Pass-1`;
      secrets.add(password);
      const register = await api.request("POST", "/api/account/register", {
        body: { email, password, passwordConfirm: password, firstName: `Vor${marker}`, lastName: `Nach${marker}`, phone: `+49 30 ${marker}`, acceptTerms: true, acceptPrivacy: true },
      });
      expect(register.json?.success, register.text.slice(0, 200)).toBe(true);
      if (register.json.token) secrets.add(register.json.token);
      await api.request("POST", "/api/account/login", { body: { email, password: `wrong-${marker}` } });
      await api.request("POST", "/api/account/password-reset/request", { body: { email } });
      await api.request("POST", "/api/auth/login", { body: { email, password: `wrong-${marker}` } });
      await api.request("POST", "/api/identity-security/auth/login", { body: { email, password: `wrong-${marker}` } });

      // Signed-in activity that goes to the operations audit table.
      const session = register.json.token;
      for (const route of ["/api/account/me", "/api/account/orders", "/api/account/export"]) await api.request("GET", route, { token: session });
      await api.request("POST", "/api/account/deletion-request", { token: session, body: {} });
      const handle = new Database(path.join(api.root, "catalog.sqlite"), { readonly: true });
      const operations = handle.prepare("SELECT actor, action, metadata_json FROM core_operations_audit").all();
      handle.close();
      const own = operations.filter((row) => row.actor === register.json.user?.id || /customer/i.test(row.action));
      expect(own.length).toBeGreaterThan(0);

      const logs = JSON.stringify(audit()) + JSON.stringify(security()) + JSON.stringify(operations) + api.output();
      for (const value of [email, `Vor${marker}`, `Nach${marker}`, `+49 30 ${marker}`, `wrong-${marker}`]) expect(logs).not.toContain(value);
      const customerEntries = audit().filter((entry) => entry.entityType === "customer");
      expect(customerEntries.length).toBeGreaterThanOrEqual(2);
      for (const entry of customerEntries) {
        expect(entry.userEmail).toBeNull();
        expect(entry.userId).toBeTruthy();
      }
      const failures = security().filter((entry) => entry.email === `ku***@synthetic.invalid`);
      expect(failures.length).toBeGreaterThanOrEqual(2);
      for (const entry of failures) expect(entry.emailRef).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe("contact form", () => {
    it("the sender's name and address are not written to the server output or the logs", async () => {
      const marker = randomBytes(5).toString("hex");
      const res = await api.request("POST", "/api/contact", {
        body: { name: `Anfrage ${marker}`, email: `anfrage-${marker}@synthetic.invalid`, message: `Nachricht ${marker}` },
      });
      expect(res.status).toBe(200);
      expect(api.readStore("submissions.json").some((entry) => entry.email === `anfrage-${marker}@synthetic.invalid`)).toBe(true);
      const logs = JSON.stringify(audit()) + JSON.stringify(security()) + api.output();
      expect(logs).not.toContain(marker);
      expect(api.output()).toMatch(/Kontaktanfrage gespeichert: \d+/);
    });

    it("a damaged submissions file is set aside, not overwritten, and the next message is stored", async () => {
      const file = path.join(api.dataDir, "submissions.json");
      const earlier = readFileSync(file, "utf8");
      writeFileSync(file, `${earlier.slice(0, Math.floor(earlier.length / 2))}`);
      const res = await api.request("POST", "/api/contact", {
        body: { name: "Syn Thetic", email: "danach@synthetic.invalid", message: "Nachricht nach dem Schaden" },
      });
      expect(res.status).toBe(200);
      const names = readdirSync(api.dataDir).filter((name) => name.startsWith("submissions.json"));
      expect(names.some((name) => /\.corrupt-[0-9a-f]{12}$/.test(name))).toBe(true);
      // The earlier messages come back from the previous version; nothing started from empty.
      const now = api.readStore("submissions.json");
      expect(now.some((entry) => entry.email === "danach@synthetic.invalid")).toBe(true);
      expect(statSync(file).mode & 0o077).toBe(0);
    });

    it("its request budget cannot be reset by writing a different sender address into a header", async () => {
      const statuses = [];
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const res = await api.request("POST", "/api/contact", {
          body: { name: "Syn Thetic", email: "anfrage@synthetic.invalid", message: `Nachricht ${attempt}` },
          headers: { "X-Forwarded-For": `203.0.113.${attempt + 1}` },
        });
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
      expect(statuses.at(-1)).toBe(429);
    });
  });

  describe("nothing secret is written anywhere", () => {
    it("no password, session token or signing key in any store file or in the server output", () => {
      const files = readdirSync(api.dataDir)
        .filter((name) => !name.endsWith(".bak"))
        .map((name) => [name, readFileSync(path.join(api.dataDir, name), "utf8")]);
      const output = api.output();
      expect(secrets.size).toBeGreaterThan(12);
      for (const secret of secrets) {
        expect(output.includes(secret), "server output").toBe(false);
        for (const [name, content] of files) {
          if (name === "customer-sessions.json") continue; // customer store, outside the admin stores; see report
          expect(content.includes(secret), name).toBe(false);
        }
      }
      const logs = JSON.stringify(audit()) + JSON.stringify(security());
      expect(logs).not.toMatch(/Bearer [A-Za-z0-9._-]{20,}/);
      expect(logs).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}\.eyJ/);
      expect(logs).not.toMatch(/scrypt[:$][0-9a-f]{16,}/);
      expect(logs).not.toMatch(/"(password|newPassword|currentPassword|token|authorization|cookie|secret)":\s*"(?!\[redacted)/i);
    });
  });

  describe("tamper evidence", () => {
    it("both logs form an unbroken chain, and a changed entry is reported with its position", async () => {
      const before = await api.request("GET", "/api/admin/security/stores", { token: tokens.administrator });
      const state = Object.fromEntries(before.json.stores.map((store) => [store.store, store]));
      expect(state["audit-log.json"].chain).toMatchObject({ ok: true, legacy: 0, brokenAt: null });
      expect(state["security-log.json"].chain).toMatchObject({ ok: true, legacy: 0, brokenAt: null });

      // Someone with access to the disk rewrites history: a refused attempt becomes a success.
      const file = path.join(api.dataDir, "audit-log.json");
      const entries = JSON.parse(readFileSync(file, "utf8"));
      const index = entries.findIndex((entry) => entry.result === "denied");
      const original = readFileSync(file, "utf8");
      entries[index].result = "success";
      writeFileSync(file, JSON.stringify(entries, null, 2));
      const after = await api.request("GET", "/api/admin/security/stores", { token: tokens.administrator });
      const report = after.json.stores.find((store) => store.store === "audit-log.json");
      expect(after.json.healthy).toBe(false);
      expect(report).toMatchObject({ healthy: false, chain: { ok: false, brokenAt: index, reason: "entry_changed" } });
      writeFileSync(file, original);
    });
  });
});

describe("log writers", () => {
  let lib;
  afterEach(() => {
    lib?.restore();
    lib = null;
    vi.restoreAllMocks();
  });

  function setup(env = {}) {
    const dataDir = tempDataDir("logging");
    lib = freshServerLib({ BUZZARD_DATA_DIR: dataDir, BUZZARD_TEST_MODE: "1", ...env });
    return dataDir;
  }
  const read = (dataDir, name) => JSON.parse(readFileSync(path.join(dataDir, name), "utf8"));

  it.each([
    ["0", "198.51.100.7"],
    ["1", "203.0.113.9"],
    ["2", "203.0.113.5"],
  ])("with %s trusted proxies the audit entry carries %s", (hops, expected) => {
    const dataDir = setup({ BUZZARD_TRUSTED_PROXY_HOPS: hops });
    const req = fakeRequest("198.51.100.7", { "x-forwarded-for": "192.0.2.66, 203.0.113.5, 203.0.113.9" });
    req.adminUser = { userId: "usr-synthetic", email: "synthetic@unit.buzzard.test", role: "admin" };
    lib.load("coreAudit.js").logAuditFromRequest(req, { action: "unit.test" });
    expect(read(dataDir, "audit-log.json")[0]).toMatchObject({ ip: expected, userId: "usr-synthetic", role: "admin", actorType: "user" });
  });

  it("an address that is not an address is not written", () => {
    const dataDir = setup({ BUZZARD_TRUSTED_PROXY_HOPS: "1" });
    const req = fakeRequest("198.51.100.7", { "x-forwarded-for": "<img src=x onerror=alert(1)>" });
    lib.load("coreAudit.js").logAuditFromRequest(req, { action: "unit.test" });
    lib.load("securityLog.js").logSecurityEvent({ type: "permission_denied", success: false, ip: lib.load("security.js").getClientIp(req) });
    expect(read(dataDir, "audit-log.json")[0].ip).toBe("unknown");
    expect(readFileSync(path.join(dataDir, "security-log.json"), "utf8")).not.toContain("<img");
  });

  it("keeps the names the commerce modules use for actor and resource", () => {
    const dataDir = setup();
    lib.load("coreAudit.js").logAudit({ action: "commerce.go_live_request", actorType: "admin", actorId: "usr-synthetic", resourceType: "commerce", resourceId: "glr-1", metadata: { note: "kept" } });
    expect(read(dataDir, "audit-log.json")[0]).toMatchObject({ userId: "usr-synthetic", actorType: "admin", entityType: "commerce", entityId: "glr-1", result: "success" });
  });

  it("strips control characters and bounds every text field", () => {
    const dataDir = setup();
    lib.load("coreAudit.js").logAudit({ userId: "usr\u0000-1\n", action: `a\r\n${"x".repeat(500)}`, entityId: "e".repeat(900), userAgent: "u".repeat(900) });
    lib.load("securityLog.js").logSecurityEvent({ type: "x\ny", path: `/api/${"p".repeat(900)}`, resource: "r\u0007", userId: "u".repeat(900) });
    const entry = read(dataDir, "audit-log.json")[0];
    expect(entry.userId).toBe("usr-1");
    expect(entry.action).toHaveLength(120);
    expect(entry.action).not.toMatch(/[\r\n]/);
    expect(entry.entityId).toHaveLength(200);
    expect(entry.userAgent).toHaveLength(300);
    const event = read(dataDir, "security-log.json")[0];
    expect(event.type).toBe("xy");
    expect(event.path).toHaveLength(300);
    expect(event.resource).toBe("r");
    expect(event.userId).toHaveLength(120);
  });

  it("stamps entries with the ids of the request they were written for, and none outside a request", () => {
    const dataDir = setup();
    const scope = lib.load("requestScope.js");
    const log = lib.load("securityLog.js");
    const auditLog = lib.load("coreAudit.js");
    scope.run({ requestId: "req_a", correlationId: "corr_a" }, () => {
      log.logSecurityEvent({ type: "permission_denied", success: false });
      auditLog.logAudit({ action: "unit.inside" });
    });
    log.logSecurityEvent({ type: "admin_bootstrap" });
    auditLog.logAudit({ action: "unit.outside" });
    const events = read(dataDir, "security-log.json");
    const entries = read(dataDir, "audit-log.json");
    expect(events[0]).toMatchObject({ requestId: "req_a", correlationId: "corr_a" });
    expect(entries[0]).toMatchObject({ requestId: "req_a", correlationId: "corr_a" });
    expect(events[1].requestId).toBeUndefined();
    expect(entries[1].correlationId).toBeUndefined();
  });

  it("keeps two requests that run at the same time apart", async () => {
    const dataDir = setup();
    const scope = lib.load("requestScope.js");
    const log = lib.load("securityLog.js");
    await Promise.all(
      ["a", "b", "c"].map((name, index) =>
        scope.run({ requestId: `req_${name}`, correlationId: `corr_${name}` }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 15 - index * 5));
          log.logSecurityEvent({ type: "permission_denied", success: false, userId: name });
        })
      )
    );
    for (const event of read(dataDir, "security-log.json")) expect(event.requestId).toBe(`req_${event.userId}`);
  });

  it("an address that keeps asking without credentials gets a bounded number of entries and one summary", () => {
    const dataDir = setup();
    const log = lib.load("securityLog.js");
    for (let attempt = 0; attempt < 100; attempt += 1) {
      log.logSecurityEvent({ type: "admin_auth_required", success: false, ip: "203.0.113.50", path: `/api/admin/${attempt}` });
    }
    // Another address is not affected, and neither is anything that concerns an account.
    log.logSecurityEvent({ type: "admin_auth_required", success: false, ip: "203.0.113.51" });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      log.logSecurityEvent({ type: "admin_login_failed", success: false, ip: "203.0.113.50", email: `konto-${attempt}@unit.buzzard.test` });
      log.logSecurityEvent({ type: "permission_denied", success: false, ip: "203.0.113.50", userId: "usr-synthetic" });
      log.logSecurityEvent({ type: "webhook_rejected", success: false, ip: "203.0.113.50", detail: { scope: "payments" } });
    }
    let events = read(dataDir, "security-log.json");
    expect(events.filter((entry) => entry.type === "admin_auth_required" && entry.ip === "203.0.113.50")).toHaveLength(log.ANONYMOUS_FAILURES_PER_WINDOW);
    expect(events.filter((entry) => entry.ip === "203.0.113.51")).toHaveLength(1);
    for (const type of ["admin_login_failed", "permission_denied", "webhook_rejected"]) {
      expect(events.filter((entry) => entry.type === type), type).toHaveLength(40);
    }

    log.flushAnonymousBudget(Date.now(), { all: true });
    events = read(dataDir, "security-log.json");
    const summary = events.filter((entry) => entry.type === "unauthenticated_requests_summarised");
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      ip: "203.0.113.50",
      severity: "HIGH",
      success: false,
      detail: { repeated: 70, windowSeconds: 60, types: { admin_auth_required: 70 } },
    });
    expect(lib.load("recordStore.js").verifyChain(events)).toMatchObject({ ok: true });
  });

  it("gives every known event type a severity and marks refusals as not successful", () => {
    setup();
    const { EVENT_SEVERITY, inferSeverity } = lib.load("securityLog.js");
    for (const [type, severity] of Object.entries(EVENT_SEVERITY)) expect(severity, type).toMatch(/^(INFO|WARNING|HIGH|CRITICAL)$/);
    for (const type of ["webhook_rejected", "ai_permission_violation", "privilege_escalation_attempt", "admin_login_locked", "csrf_failure"]) {
      expect(["HIGH", "CRITICAL"]).toContain(inferSeverity(type));
    }
  });
});
