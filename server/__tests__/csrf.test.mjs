import { describe, it, expect, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateCsrfForRequest, usesBearerAuth, generateCsrfToken } = require("../lib/csrf");

function mockReq(overrides = {}) {
  return {
    method: "POST",
    url: "/api/admin/settings",
    headers: {},
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

describe("csrf", () => {
  const prev = process.env.BUZZARD_CSRF_ENFORCE;

  afterEach(() => {
    process.env.BUZZARD_CSRF_ENFORCE = prev;
  });

  it("GET requests pass without token", () => {
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    expect(validateCsrfForRequest(req, res)).toBe(true);
  });

  it("Bearer auth exempt from CSRF", () => {
    process.env.BUZZARD_CSRF_ENFORCE = "1";
    const req = mockReq({
      headers: { authorization: "Bearer test-token" },
    });
    const res = mockRes();
    expect(validateCsrfForRequest(req, res)).toBe(true);
    expect(usesBearerAuth(req)).toBe(true);
  });

  it("rejects cookie session POST without matching CSRF when enforced", () => {
    process.env.BUZZARD_CSRF_ENFORCE = "1";
    const token = generateCsrfToken();
    const req = mockReq({
      headers: {
        cookie: `buzzard_csrf=${token}`,
        "x-buzzard-csrf-token": "wrong",
      },
    });
    const res = mockRes();
    expect(validateCsrfForRequest(req, res)).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("accepts matching CSRF token when enforced", () => {
    process.env.BUZZARD_CSRF_ENFORCE = "1";
    const token = generateCsrfToken();
    const req = mockReq({
      headers: {
        cookie: `buzzard_csrf=${token}`,
        "x-buzzard-csrf-token": token,
      },
    });
    const res = mockRes();
    expect(validateCsrfForRequest(req, res)).toBe(true);
  });
});
