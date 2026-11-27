import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const { withIdempotency } = require("../lib/commerce/idempotency");
const correlation = require("../lib/operations/correlationContext");
const { executeReadOnly } = require("../lib/pusat/runtime");
const controlCenter = require("../lib/controlCenter");
const esat = require("../lib/security/esatBey");
const { db } = require("../lib/db");

describe("local closed surface", () => {
  it("replays one idempotency key and rejects a second payload", () => {
    const key = `idem-${randomBytes(4).toString("hex")}`;
    let calls = 0;
    const first = withIdempotency({
      key,
      scope: "local-surface",
      payload: { amount: 1 },
      handler: () => {
        calls += 1;
        return { ok: true, amount: 1 };
      },
    });
    const replay = withIdempotency({
      key,
      scope: "local-surface",
      payload: { amount: 1 },
      handler: () => {
        calls += 1;
        return { ok: true, amount: 9 };
      },
    });
    const conflict = withIdempotency({
      key,
      scope: "local-surface",
      payload: { amount: 2 },
      handler: () => ({ ok: true, amount: 2 }),
    });
    expect(first.amount).toBe(1);
    expect(replay.idempotencyReplay).toBe(true);
    expect(replay.amount).toBe(1);
    expect(calls).toBe(1);
    expect(conflict.status).toBe(409);
    expect(conflict.code).toBe("ORDER_IDEMPOTENCY_CONFLICT");
  });

  it("drops a broken correlation id instead of echoing it", () => {
    const ctx = correlation.createContext({
      requestId: "req ok",
      correlationId: "corr\r\nSet-Cookie: x",
    });
    expect(ctx.requestId).toMatch(/^req_/);
    expect(ctx.correlationId).toMatch(/^corr_/);
    expect(ctx.correlationId).not.toContain("Set-Cookie");
    correlation.releaseContext(ctx.requestId);
  });

  it("returns retryable false when Pusat refuses a payment write", () => {
    const previous = process.env.PUSAT_RUNTIME_ENABLED;
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    try {
      const denied = executeReadOnly("CAPTURE_PAYMENT", {}, { actorId: "pricing_ai" });
      expect(denied.code).toBe("PERMISSION_DENIED");
      expect(denied.retryable).toBe(false);
      expect(denied.live).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
      else process.env.PUSAT_RUNTIME_ENABLED = previous;
    }
  });

  it("keeps an agent from deciding a control-center approval", () => {
    const approval = controlCenter.createApproval({
      taskId: `task-${randomBytes(3).toString("hex")}`,
      resourceType: "product",
      reason: "local surface",
      riskLevel: "LOW",
    });
    expect(controlCenter.decideApproval(approval.id, "approve", "pricing_ai")).toBeNull();
    expect(db.prepare("SELECT status FROM core_approvals WHERE id = ?").get(approval.id).status).toBe("PENDING");
  });

  it("holds purchase, refund, wire, and drop-table text, and fails closed if evaluation throws", () => {
    for (const sample of ["drop table orders", "wire transfer now", "purchase order 9", "issue refund 40"]) {
      const verdict = esat.evaluate(sample);
      expect(verdict.allowed).toBe(false);
      expect(verdict.hold).toBe(true);
    }
    expect(esat.scanSecrets("aws_secret_access_key").allowed).toBe(false);
    expect(esat.evaluate("ordinary catalog note").allowed).toBe(true);
    const original = esat.scanText;
    esat.scanText = () => {
      throw new Error("scanner down");
    };
    try {
      expect(esat.evaluate("anything").code).toBe("EVALUATE_FAILED");
    } finally {
      esat.scanText = original;
    }
  });
});

describe("loyalty points stay behind the admin gate", () => {
  let api;
  afterAll(async () => {
    if (api) await api.stop();
  });

  it("refuses a tokenless point adjustment", async () => {
    api = await startIsolatedApi({
      roles: ["administrator"],
      seed: false,
      env: { BUZZARD_SALES_ENABLED: "0", BUZZARD_TEST_MODE: "1" },
    });
    const response = await fetch(`${api.url}/api/marketing-loyalty/points`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customerId: "stranger", points: 1000 }),
    });
    const text = await response.text();
    expect(response.status).toBe(401);
    expect(text).not.toContain("stranger");
  });
});
