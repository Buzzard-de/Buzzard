import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { wrapRouteHandler } = require("../lib/globalAuthMiddleware");
const { resolveRoutePermission } = require("../lib/routePermissions");

function mockReq(overrides = {}) {
  return {
    method: "GET",
    url: "/api/admin/pusat/exceptions",
    headers: {},
    params: {},
    body: {},
    query: {},
    ...overrides,
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("item 40/45 — pusat exceptions lastError", () => {
  let pusat;
  let db;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    pusat.initialize(db);
  });

  it("requires auth and security.read on GET /api/admin/pusat/exceptions", () => {
    expect(resolveRoutePermission("GET", "/api/admin/pusat/exceptions")).toEqual({
      permission: "security.read",
    });
    const handler = wrapRouteHandler("GET", "/api/admin/pusat/exceptions", () => {
      throw new Error("handler must not run");
    });
    const res = mockRes();
    handler(mockReq(), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.errorKey).toBe("admin.auth.required");
  });

  it("does not return SQL, paths, stacks, or secrets on get/list", () => {
    const handled = pusat.exceptions.handleFailure(
      new Error("SQLITE_ERROR: no such table /var/data/buzzard.db\n    at Database.prepare"),
      { taskId: "task_exc_sql", action: "prices.update" }
    );
    expect(handled.exception.lastError).toBe(handled.classified.code);
    expect(JSON.stringify(handled.exception)).not.toContain("SQLITE_ERROR");
    expect(JSON.stringify(handled.exception)).not.toContain("/var/data");
    expect(JSON.stringify(handled.exception)).not.toContain("at Database.prepare");

    const listed = pusat.exceptions.listExceptions({ taskId: "task_exc_sql" });
    expect(listed.length).toBeGreaterThan(0);
    expect(JSON.stringify(listed)).not.toContain("SQLITE_ERROR");
    expect(listed[0].code).toBeTruthy();
    expect(listed[0].retryable).toBe(false);
  });

  it("sanitizes legacy free-text last_error rows on read", () => {
    const recorded = pusat.exceptions.recordException({
      code: "PUSAT_UNKNOWN",
      taskId: "task_exc_legacy",
      retryable: true,
      lastError: "safe-key",
    });
    db.prepare("UPDATE core_ai_exceptions SET last_error = ? WHERE id = ?").run(
      "SQLITE_ERROR: no such table /tmp/secret.db token=sk_live_abc",
      recorded.id
    );
    const fetched = pusat.exceptions.getException(recorded.id);
    expect(fetched.lastError).toBe("PUSAT_UNKNOWN");
    expect(JSON.stringify(fetched)).not.toContain("SQLITE_ERROR");
    expect(JSON.stringify(fetched)).not.toContain("sk_live_abc");
    expect(JSON.stringify(fetched)).not.toContain("/tmp/secret");
  });

  it("preserves classified codes and dead-letter listing", () => {
    const recorded = pusat.exceptions.recordException({
      code: "PUSAT_UNKNOWN",
      taskId: "task_exc_dl",
      retryable: true,
      lastError: "flaky",
      maxRetries: 1,
    });
    expect(recorded.lastError).toBe("flaky");
    pusat.exceptions.markRetry(recorded.id);
    const dead = pusat.exceptions.deadLetter(recorded.id, "retry_limit");
    expect(dead.status).toBe("DEAD_LETTER");
    expect(dead.lastError).toBe("retry_limit");
    expect(dead.code).toBe("PUSAT_UNKNOWN");
  });
});
