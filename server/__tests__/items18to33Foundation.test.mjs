import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const { defaultDbPath, resolveDbPath, getPersistenceInfo } = require("../lib/dbPaths");
const { isSalesEnabled } = require("../lib/salesMode");
const { canTransitionCheckout, canTransitionOrder, CHECKOUT_STATE, ORDER_STATUS } = require("../core/commerceConstants");
const { publicErrorBody } = require("../lib/security");
const { validateQuantity, rejectClientTotals } = require("../lib/commerce/commerceValidation");
const { createRateLimiter } = require("../lib/rateLimitStore");
const { getSalesSafetyStatus } = require("../lib/commerce/commerceGuards");

describe("items 18-33 foundation", () => {
  it("keeps the application database off /tmp unless a test process asks for isolation", () => {
    expect(defaultDbPath.includes("/tmp")).toBe(false);
    expect(defaultDbPath.endsWith("buzzard.db")).toBe(true);

    const previous = process.env.BUZZARD_DB_PATH;
    process.env.BUZZARD_DB_PATH = "/var/data/buzzard.db";
    try {
      expect(resolveDbPath()).toBe("/var/data/buzzard.db");
      expect(getPersistenceInfo("/var/data/buzzard.db").persistent).toBe(true);
      expect(getPersistenceInfo("/tmp/buzzard.db").persistent).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.BUZZARD_DB_PATH;
      else process.env.BUZZARD_DB_PATH = previous;
    }
  });

  it("keeps sales, the bypass, and catalog mode fail-closed", () => {
    const previousSales = process.env.BUZZARD_SALES_ENABLED;
    const previousBypass = process.env.BUZZARD_SALES_GATE_BYPASS;
    delete process.env.BUZZARD_SALES_ENABLED;
    process.env.BUZZARD_SALES_GATE_BYPASS = "1";
    try {
      expect(isSalesEnabled()).toBe(false);
      expect(getSalesSafetyStatus().catalogMode).toBe(true);
      expect(getSalesSafetyStatus().salesEnabled).toBe(false);
    } finally {
      if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
      else process.env.BUZZARD_SALES_ENABLED = previousSales;
      if (previousBypass === undefined) delete process.env.BUZZARD_SALES_GATE_BYPASS;
      else process.env.BUZZARD_SALES_GATE_BYPASS = previousBypass;
    }
  });

  it("rejects illegal checkout and order transitions", () => {
    expect(canTransitionCheckout(CHECKOUT_STATE.DRAFT, CHECKOUT_STATE.VALIDATING)).toBe(true);
    expect(canTransitionCheckout(CHECKOUT_STATE.DRAFT, CHECKOUT_STATE.COMPLETED)).toBe(false);
    expect(canTransitionCheckout(CHECKOUT_STATE.COMPLETED, CHECKOUT_STATE.DRAFT)).toBe(false);
    expect(canTransitionOrder(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED)).toBe(true);
    expect(canTransitionOrder(ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED)).toBe(false);
    expect(canTransitionOrder(ORDER_STATUS.REFUNDED, ORDER_STATUS.PAID)).toBe(false);
  });

  it("publishes an error key and refuses client totals and a negative quantity", () => {
    const body = publicErrorBody("security.internalError");
    expect(body).toEqual({ success: false, errorKey: "security.internalError" });
    expect(JSON.stringify(body)).not.toContain("stack");
    expect(validateQuantity(-1).ok).toBe(false);
    expect(validateQuantity(0).ok).toBe(false);
    expect(rejectClientTotals({ total: 1 }).ok).toBe(false);
    expect(rejectClientTotals({}).ok).toBe(true);
  });

  it("does not let a health bucket consume the API bucket", () => {
    const health = createRateLimiter({ windowMs: 60_000, max: 1, keyPrefix: "health-item31:" });
    const api = createRateLimiter({ windowMs: 60_000, max: 1, keyPrefix: "api-item31:" });
    const req = { socket: { remoteAddress: "127.0.0.1" }, headers: {} };
    expect(health(req)).toBe(false);
    expect(health(req)).toBe(true);
    expect(api(req)).toBe(false);
  });
});

describe("item 29 request ids", () => {
  let api;
  beforeAll(async () => {
    api = await startIsolatedApi({ roles: ["administrator"], seed: false });
  }, 60_000);
  afterAll(async () => {
    await api?.stop();
  });

  it("returns request and correlation ids on the health probe", async () => {
    const res = await api.request("GET", "/api/health", { headers: { "x-correlation-id": "corr-item29" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(res.headers.get("x-correlation-id")).toBe("corr-item29");
  });
});
