import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { assertSafeId, assertAdminRole, assertNotSelfEscalation } = require("../lib/idorGuard");

function mockReq(overrides = {}) {
  return {
    url: "/api/admin/users/1",
    headers: {},
    adminUser: { userId: "u1", email: "admin@test.de", role: "read_only" },
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

describe("idorGuard", () => {
  it("assertSafeId rejects path traversal id", () => {
    const req = mockReq();
    const res = mockRes();
    expect(assertSafeId(req, res, "../etc/passwd")).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("assertSafeId accepts safe id", () => {
    const req = mockReq();
    const res = mockRes();
    expect(assertSafeId(req, res, "cat-automotive")).toBe(true);
  });

  it("assertAdminRole blocks privilege escalation to super_admin", () => {
    const req = mockReq({ adminUser: { userId: "u1", role: "read_only" } });
    const res = mockRes();
    expect(assertAdminRole(req, res, "super_admin")).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("assertNotSelfEscalation blocks self role change", () => {
    const req = mockReq({ adminUser: { userId: "u1", role: "read_only" } });
    const res = mockRes();
    expect(assertNotSelfEscalation(req, res, "u1", "administrator")).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});
