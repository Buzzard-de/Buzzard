import { createRequire } from "node:module";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ALL_ROLES, startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { can } = require("../lib/rbac.js");
const { AI_CENTER_ROUTES, resolveRoutePermission } = require("../lib/routePermissions.js");
const aiCenterAccess = require("../lib/aiCenterAccess.js");

/**
 * The AI Center routes against the real server process, with synthetic
 * accounts of every role. No worker runs and no AI provider is called: the
 * suite runs without network access and every answer has to say so itself.
 */

const UUID = "00000000-0000-4000-8000-000000000000";

/** Route, permission, a valid synthetic body, and the answer an allowed caller gets. */
const ROUTES = [
  { method: "POST", route: "/api/ai-center/sessions", permission: "ai.execute", body: { language: "de", channel: "web" }, allowed: 201 },
  { method: "GET", route: `/api/ai-center/sessions/${UUID}`, pattern: "/api/ai-center/sessions/:token", permission: "ai.read", allowed: 404 },
  { method: "POST", route: "/api/ai-center/chat", permission: "ai.execute", body: { message: "Wie funktioniert die Rückgabe?", language: "de" }, allowed: 200 },
  { method: "POST", route: "/api/ai-center/recommend", permission: "ai.execute", body: { query: "Bremsscheiben für Testfahrzeug" }, allowed: 200 },
  { method: "POST", route: "/api/ai-center/product-copy", permission: "ai.execute", body: { product: { name: "Synthetic part" }, productSku: "SYN-1" }, allowed: 202 },
  { method: "POST", route: "/api/ai-center/translate", permission: "ai.execute", body: { text: "Synthetic text", targetLanguage: "en", entityId: "SYN-1" }, allowed: 202 },
  { method: "POST", route: "/api/ai-center/review-sentiment", permission: "ai.execute", body: { review: "Synthetic review", reviewId: "1" }, allowed: 202 },
  { method: "POST", route: "/api/ai-center/smart-search", permission: "ai.execute", body: { query: "Ölfilter", filters: ["brand:synthetic"] }, allowed: 200 },
  { method: "POST", route: "/api/ai-center/jobs/999999/retry", pattern: "/api/ai-center/jobs/:id/retry", permission: "ai.assign", body: {}, allowed: 404 },
];

const AI_TABLES = ["aictr_sessions", "aictr_messages", "aictr_jobs", "aictr_audit", "core_approvals"];

describe("AI Center routes", () => {
  let api;
  let db;
  const tokens = {};

  const counts = () => Object.fromEntries(AI_TABLES.map((table) => [table, db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n]));
  const send = (entry, token, body = entry.body) => api.request(entry.method, entry.route, { token, body: entry.method === "GET" ? undefined : body });

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
    for (const role of ALL_ROLES) tokens[role] = await api.login(role);
    db = new Database(path.join(api.root, "catalog.sqlite"), { readonly: true });
    db.pragma("busy_timeout = 5000");
  }, 90_000);
  afterAll(async () => {
    db?.close();
    await api?.stop();
  });

  it("are all in the central policy", () => {
    expect(Object.keys(AI_CENTER_ROUTES)).toHaveLength(9);
    for (const entry of ROUTES) {
      expect(resolveRoutePermission(entry.method, entry.pattern || entry.route), entry.route).toEqual({ permission: entry.permission });
    }
    expect(Object.keys(AI_CENTER_ROUTES).filter((key) => key.startsWith("POST "))).toHaveLength(8);
  });

  describe.each(ROUTES)("$method $route", (entry) => {
    it("refuses an anonymous caller and changes nothing", async () => {
      const before = counts();
      const res = await send(entry, undefined);
      expect(res.status).toBe(401);
      expect(res.json).toEqual({ success: false, errorKey: "admin.auth.required" });
      expect(counts()).toEqual(before);
    });

    it("refuses forged and foreign credentials", async () => {
      const customer = await api.request("POST", "/api/auth/register", {
        body: { email: `ai-${Math.random().toString(36).slice(2)}@synthetic.invalid`, password: "Synthetic-Customer-Pass-1", name: "Synthetic Customer" },
      });
      const before = counts();
      for (const token of ["a".repeat(64), "not-a-token", customer.json.token]) {
        const res = await send(entry, token);
        expect(res.status).toBe(401);
      }
      expect(counts()).toEqual(before);
    });

    it("follows the permission for every role", async () => {
      for (const role of ALL_ROLES) {
        const before = counts();
        const res = await send(entry, tokens[role]);
        if (can(role, entry.permission)) {
          expect(res.status, `${role}: ${res.text.slice(0, 160)}`).toBe(entry.allowed);
        } else {
          expect(res.status, role).toBe(403);
          expect(res.json.errorKey, role).toBe("admin.auth.forbidden");
          expect(counts(), role).toEqual(before);
        }
      }
    });

    it("answers with no-store and without a session cookie", async () => {
      const res = await send(entry, tokens.administrator);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("set-cookie")).toBeNull();
    });
  });

  describe("who may do what", () => {
    it("lets only ai.execute roles start AI work", () => {
      expect(ALL_ROLES.filter((role) => can(role, "ai.execute")).sort()).toEqual(["admin", "administrator", "ai_agent"]);
      expect(ALL_ROLES.filter((role) => can(role, "ai.assign")).sort()).toEqual(["admin", "administrator"]);
    });

    it("the read-only role cannot write anything here", async () => {
      const before = counts();
      for (const entry of ROUTES.filter((route) => route.method === "POST")) {
        expect((await send(entry, tokens.read_only)).status, entry.route).toBe(403);
      }
      expect(counts()).toEqual(before);
    });

    it("the AI agent role cannot put a job back in the queue", async () => {
      const res = await api.request("POST", "/api/ai-center/jobs/1/retry", { token: tokens.ai_agent, body: {} });
      expect(res.status).toBe(403);
    });
  });

  describe("no execution without a person", () => {
    it.each([
      ["/api/ai-center/product-copy", { product: { name: "Synthetic part" }, productSku: "SYN-HOLD-1" }],
      ["/api/ai-center/translate", { text: "Synthetic text", targetLanguage: "en", entityId: "SYN-HOLD-2" }],
      ["/api/ai-center/review-sentiment", { review: "Synthetic review", reviewId: "77" }],
    ])("%s creates a held job and a pending approval, nothing more", async (route, body) => {
      const before = counts();
      const res = await api.request("POST", route, { token: tokens.ai_agent, body });
      expect(res.status).toBe(202);
      expect(res.json).toMatchObject({ pendingApproval: true, executed: false, dryRun: true, providerCalled: false });
      expect(res.json.approval.status).toBe("PENDING");
      const after = counts();
      expect(after.aictr_jobs).toBe(before.aictr_jobs + 1);
      expect(after.core_approvals).toBe(before.core_approvals + 1);
      const job = db.prepare("SELECT status, output_json, completed_at FROM aictr_jobs WHERE id = ?").get(res.json.jobId);
      expect(job).toEqual({ status: "APPROVAL_REQUIRED", output_json: null, completed_at: null });
    });

    it.each([
      ["/api/ai-center/chat", { message: "Please refund order BZ-SYN-1" }],
      ["/api/ai-center/chat", { action: "refund", orderNumber: "BZ-SYN-1" }],
      ["/api/ai-center/recommend", { query: "buy 500 units", action: "purchase_stock" }],
      ["/api/ai-center/smart-search", { query: "place an order for this" }],
    ])("%s with a commercial request is held for approval and starts nothing: %j", async (route, body) => {
      const res = await api.request("POST", route, { token: tokens.admin, body });
      expect(res.status).toBe(202);
      expect(res.json).toMatchObject({
        pendingApproval: true,
        executed: false,
        dryRun: true,
        providerCalled: false,
        orderStarted: false,
        paymentStarted: false,
        cancelStarted: false,
        refundStarted: false,
        purchaseStarted: false,
      });
    });

    it("a retry never runs a job, also for a supervisor", async () => {
      const held = await api.request("POST", "/api/ai-center/translate", { token: tokens.admin, body: { text: "Synthetic", targetLanguage: "fr" } });
      const res = await api.request("POST", `/api/ai-center/jobs/${held.json.jobId}/retry`, { token: tokens.administrator, body: {} });
      expect(res.status).toBe(409);
      expect(res.json).toMatchObject({ ok: false, code: "APPROVAL_REQUIRED", executed: false, dryRun: true });
      expect(db.prepare("SELECT status FROM aictr_jobs WHERE id = ?").get(held.json.jobId).status).toBe("APPROVAL_REQUIRED");
    });

    it("no AI job is completed, no answer came from a model, and no worker claimed anything", () => {
      expect(db.prepare("SELECT COUNT(*) n FROM aictr_jobs WHERE status IN ('completed', 'running', 'queued')").get().n).toBe(0);
      expect(db.prepare("SELECT COUNT(*) n FROM aictr_messages WHERE role = 'assistant' AND model <> 'none'").get().n).toBe(0);
      expect(api.output()).not.toMatch(/worker started|provider request|fetch failed/i);
    });
  });

  describe("input", () => {
    const post = (route, body, token = tokens.administrator) => api.request("POST", route, { token, body });

    it.each([
      ["/api/ai-center/chat", { message: "x".repeat(4001) }, "message"],
      ["/api/ai-center/chat", { message: ["a"] }, "message"],
      ["/api/ai-center/chat", { message: { $gt: "" } }, "message"],
      ["/api/ai-center/chat", { message: "bell\u0007" }, "message"],
      ["/api/ai-center/chat", { message: "hi", language: "de; DROP TABLE" }, "language"],
      ["/api/ai-center/chat", { message: "hi", sessionToken: "' OR 1=1 --" }, "sessionToken"],
      ["/api/ai-center/chat", { message: "hi", action: "constructor()" }, "action"],
      ["/api/ai-center/chat", { message: "hi", orderNumber: "../../etc/passwd" }, "orderNumber"],
      ["/api/ai-center/chat", { message: "hi", customerId: -1 }, "customerId"],
      ["/api/ai-center/chat", { message: "hi", deps: { createApproval: "x" } }, "deps"],
      ["/api/ai-center/chat", { message: "hi", role: "administrator" }, "role"],
      ["/api/ai-center/chat", { message: "hi", constructor: { prototype: { admin: true } } }, "constructor"],
      ["/api/ai-center/sessions", { language: "deutsch" }, "language"],
      ["/api/ai-center/sessions", { channel: "<script>" }, "channel"],
      ["/api/ai-center/sessions", { customerId: "1 OR 1=1" }, "customerId"],
      ["/api/ai-center/recommend", { query: "x".repeat(1001) }, "query"],
      ["/api/ai-center/product-copy", {}, "product"],
      ["/api/ai-center/product-copy", { product: { name: "ok", price: 1 } }, "product"],
      ["/api/ai-center/product-copy", { product: ["a"] }, "product"],
      ["/api/ai-center/product-copy", { product: "ok", deps: {} }, "deps"],
      ["/api/ai-center/translate", { text: "ok" }, "targetLanguage"],
      ["/api/ai-center/translate", { text: "", targetLanguage: "en" }, "text"],
      ["/api/ai-center/translate", { text: "ok", targetLanguage: "en", deps: {} }, "deps"],
      ["/api/ai-center/translate", { text: "ok", targetLanguage: "en", entityType: "a b" }, "entityType"],
      ["/api/ai-center/review-sentiment", { review: 5 }, "review"],
      ["/api/ai-center/review-sentiment", { review: "ok", deps: {} }, "deps"],
      ["/api/ai-center/smart-search", { query: "ok", filters: "brand" }, "filters"],
      ["/api/ai-center/smart-search", { query: "ok", filters: Array.from({ length: 9 }, () => "a") }, "filters"],
      ["/api/ai-center/smart-search", { query: "ok", filters: [{ a: 1 }] }, "filters"],
    ])("%s refuses %j", async (route, body, field) => {
      const before = counts();
      const res = await post(route, body);
      expect(res.status).toBe(400);
      expect(res.json).toMatchObject({ success: false, errorKey: "aiCenter.invalidInput", field });
      expect(counts()).toEqual(before);
    });

    it("refuses a body that is not an object", async () => {
      for (const raw of ["[]", '"text"', "42", "null"]) {
        const res = await api.request("POST", "/api/ai-center/chat", { token: tokens.administrator, raw, headers: { "Content-Type": "application/json" } });
        expect([400]).toContain(res.status);
      }
      expect(api.alive()).toBe(true);
    });

    it("cannot switch off the approval hold through the request body", async () => {
      // `deps` is the library's unit-test hook; with it a content request would return without a held job.
      const before = counts();
      const res = await post("/api/ai-center/product-copy", { product: "Synthetic", deps: { createApproval: null, newId: null } });
      expect(res.status).toBe(400);
      expect(counts()).toEqual(before);
    });

    it("treats prototype names as ordinary text, not as actions", async () => {
      for (const action of ["constructor", "toString", "hasOwnProperty", "valueOf"]) {
        const res = await post("/api/ai-center/chat", { message: "Wie ist der Status?", action });
        expect(res.status, action).toBe(200);
        expect(res.json).toMatchObject({ informational: true, commercial: false, executed: false });
      }
      const { decideAiAction } = require("../lib/aiCenterAuthority.js");
      for (const action of ["constructor", "__proto__", "toString"]) {
        expect(decideAiAction({ surface: "support", text: "status?", action }).commercial).toBe(false);
      }
    });

    it("refuses a job id that is not a positive number", async () => {
      for (const id of ["0", "-1", "1e3", "abc", "1;DROP", "99999999999"]) {
        const res = await api.request("POST", `/api/ai-center/jobs/${encodeURIComponent(id)}/retry`, { token: tokens.administrator, body: {} });
        expect(res.status, id).toBe(400);
      }
    });

    it("answers a malformed session token like an unknown one", async () => {
      for (const token of ["x", "1 OR 1=1", "%27", UUID]) {
        const res = await api.request("GET", `/api/ai-center/sessions/${encodeURIComponent(token)}`, { token: tokens.administrator });
        expect(res.status).toBe(404);
        expect(res.json).toEqual({ error: "Session not found" });
      }
    });
  });

  describe("conversations belong to the account that started them", () => {
    let agentSession;

    it("returns a conversation to its owner", async () => {
      const chat = await api.request("POST", "/api/ai-center/chat", { token: tokens.ai_agent, body: { message: "Wie ist der Lieferstatus?" } });
      expect(chat.status).toBe(200);
      agentSession = chat.json.sessionToken;
      const res = await api.request("GET", `/api/ai-center/sessions/${agentSession}`, { token: tokens.ai_agent });
      expect(res.status).toBe(200);
      expect(res.json.messages).toHaveLength(2);
      expect(res.json.session.owner_user_id).toBe("usr-synthetic-ai-agent");
    });

    it("hides it from other roles with ai.read", async () => {
      for (const role of ["read_only", "catalog_manager", "order_manager", "staff"]) {
        const res = await api.request("GET", `/api/ai-center/sessions/${agentSession}`, { token: tokens[role] });
        expect(res.status, role).toBe(404);
        expect(res.text, role).not.toContain("Lieferstatus");
      }
    });

    it("shows it to a supervisor (ai.assign)", async () => {
      for (const role of ["administrator", "admin"]) {
        expect((await api.request("GET", `/api/ai-center/sessions/${agentSession}`, { token: tokens[role] })).status, role).toBe(200);
      }
    });

    it("does not let another account continue it", async () => {
      const res = await api.request("POST", "/api/ai-center/chat", { token: tokens.admin, body: { message: "Noch eine Frage", sessionToken: agentSession } });
      expect(res.status).toBe(200);
      expect(res.json.sessionToken).not.toBe(agentSession);
      const own = await api.request("GET", `/api/ai-center/sessions/${agentSession}`, { token: tokens.ai_agent });
      expect(own.json.messages).toHaveLength(2);
    });

    it("lets the owner continue it", async () => {
      const res = await api.request("POST", "/api/ai-center/chat", { token: tokens.ai_agent, body: { message: "Und die Rückgabe?", sessionToken: agentSession } });
      expect(res.json.sessionToken).toBe(agentSession);
    });
  });

  describe("records", () => {
    it("writes an audit entry per operation with actor, role and result, without the text", async () => {
      const marker = `marker-${Date.now()}`;
      await api.request("POST", "/api/ai-center/chat", { token: tokens.ai_agent, body: { message: `Wo ist ${marker}?` } });
      await api.request("POST", "/api/ai-center/translate", { token: tokens.ai_agent, body: { text: marker, targetLanguage: "en" } });
      await api.request("POST", "/api/ai-center/chat", { token: tokens.ai_agent, body: { message: "x", bogus: 1 } });

      const audit = api.readStore("audit-log.json").filter((entry) => String(entry.action).startsWith("ai_center."));
      const actions = new Set(audit.map((entry) => entry.action));
      for (const action of ["ai_center.chat", "ai_center.translate", "ai_center.product_copy", "ai_center.review_sentiment", "ai_center.recommend", "ai_center.smart_search", "ai_center.session_create", "ai_center.job_retry"]) {
        expect(actions.has(action), action).toBe(true);
      }
      const results = new Set(audit.map((entry) => entry.result));
      for (const result of ["success", "pending_approval", "rejected"]) expect(results.has(result), result).toBe(true);
      for (const entry of audit) {
        expect(entry.userId).toMatch(/^usr-synthetic-/);
        expect(entry.metadata.role).toBeTruthy();
        expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
      expect(JSON.stringify(audit)).not.toContain(marker);
      expect(JSON.stringify(api.readStore("security-log.json"))).not.toContain(marker);
    });

    it("logs refused callers as security events", () => {
      const log = api.readStore("security-log.json");
      expect(log.some((entry) => entry.type === "admin_auth_required" && String(entry.path).startsWith("/api/ai-center/"))).toBe(true);
      expect(log.some((entry) => entry.type === "permission_denied" && String(entry.path).startsWith("/api/ai-center/"))).toBe(true);
    });

    it("never prints a session token", () => {
      for (const role of ALL_ROLES) expect(api.output()).not.toContain(tokens[role]);
    });
  });
});

describe("AI Center request budget", () => {
  let api;
  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: undefined, BUZZARD_RATE_LIMIT_DISABLED: undefined } });
  }, 90_000);
  afterAll(async () => api?.stop());

  it("stops an account after 30 requests in a minute, without affecting another account", async () => {
    const agent = await api.login("ai_agent");
    const admin = await api.login("admin");
    const statuses = [];
    for (let i = 0; i < 33; i += 1) {
      statuses.push((await api.request("POST", "/api/ai-center/smart-search", { token: agent, body: { query: "Ölfilter" } })).status);
    }
    expect(statuses.slice(0, 30).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(30)).toEqual([429, 429, 429]);

    const limited = await api.request("POST", "/api/ai-center/chat", { token: agent, body: { message: "Status?" } });
    expect(limited.status).toBe(429);
    expect(limited.json).toEqual({ success: false, errorKey: "security.rateLimited" });

    expect((await api.request("POST", "/api/ai-center/smart-search", { token: admin, body: { query: "Ölfilter" } })).status).toBe(200);
    const events = api.readStore("security-log.json").filter((entry) => entry.type === "api_rate_limited" && entry.detail?.scope === "ai_center");
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].userId).toBe("usr-synthetic-ai-agent");
  });
});

describe("AI Center output check", () => {
  it("passes closed answers", () => {
    expect(aiCenterAccess.checkOutput({ ok: true, executed: false, dryRun: true, providerCalled: false })).toEqual({ ok: true });
    expect(aiCenterAccess.checkOutput({ error: "Query required", status: 400 })).toEqual({ ok: true });
  });

  it.each([
    [{ executed: true }, "executed"],
    [{ providerCalled: true }, "providerCalled"],
    [{ orderStarted: true }, "orderStarted"],
    [{ paymentStarted: true }, "paymentStarted"],
    [{ cancelStarted: true }, "cancelStarted"],
    [{ refundStarted: true }, "refundStarted"],
    [{ purchaseStarted: true }, "purchaseStarted"],
    [{ dryRun: false }, "dryRun"],
    [{ job: { status: "completed" } }, "job_completed"],
    [{ answer: "x".repeat(70_000) }, "too_large"],
    [null, "not_an_object"],
    ["text", "not_an_object"],
    [[1], "not_an_object"],
  ])("blocks %j", (result, reason) => {
    expect(aiCenterAccess.checkOutput(result)).toEqual({ ok: false, reason });
  });

  it("blocks a result that cannot be serialised", () => {
    const loop = {};
    loop.self = loop;
    expect(aiCenterAccess.checkOutput(loop)).toEqual({ ok: false, reason: "not_serialisable" });
  });
});

describe("AI Center input rules", () => {
  it("keeps only known fields and drops nothing silently", () => {
    expect(aiCenterAccess.validateInput("chat", { message: "hi", language: "de" })).toEqual({ value: { message: "hi", language: "de" } });
    expect(aiCenterAccess.validateInput("chat", { message: "hi", extra: 1 })).toEqual({ error: "extra" });
    expect(aiCenterAccess.validateInput("unknown", {})).toEqual({ error: "operation" });
    expect(aiCenterAccess.validateInput("chat", null)).toEqual({ error: "body" });
    expect(aiCenterAccess.validateInput("chat", [])).toEqual({ error: "body" });
    expect(aiCenterAccess.validateInput("chat", JSON.parse('{"__proto__": {"x": 1}}'))).toEqual({ error: "__proto__" });
  });

  it("has a schema for every write operation", () => {
    expect(Object.keys(aiCenterAccess.SCHEMAS).sort()).toEqual(["chat", "productCopy", "recommend", "reviewSentiment", "session", "smartSearch", "translate"]);
    for (const schema of Object.values(aiCenterAccess.SCHEMAS)) expect(Object.keys(schema)).not.toContain("deps");
  });
});
