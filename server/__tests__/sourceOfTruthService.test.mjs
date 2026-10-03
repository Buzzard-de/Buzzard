import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createSourceOfTruthService } = require("../lib/sot/sourceOfTruthService.js");
const { createSotIdempotencyAdapter } = require("../lib/sot/sotIdempotencyAdapter.js");
const { ACTORS, ENTITIES } = require("../lib/sot/sourceOfTruthRegistry.js");
const { requireAuth } = require("../lib/auth.js");
const { requirePermission } = require("../lib/rbac.js");
const { PUBLIC_ROUTES, EXACT } = require("../lib/routePermissions.js");

function memoryCommerce() {
  const rows = new Map();
  const crypto = require("crypto");
  function payloadHash(payload) {
    return crypto.createHash("sha256").update(JSON.stringify(payload ?? null)).digest("hex");
  }
  return {
    payloadHash,
    getIdempotency({ key, scope }) {
      return rows.get(`${scope}:${key}`) || null;
    },
    storeIdempotency({ key, scope, response, payload }) {
      rows.set(`${scope}:${key}`, { response, payloadHash: payloadHash(payload), replay: true });
    },
  };
}

describe("source of truth service", () => {
  it("blocks Pusat/AI through the public SoT API and keeps safety gates off", () => {
    const audits = [];
    const service = createSourceOfTruthService({
      env: { BUZZARD_PRODUCT_SOT_ACTIVE: "0", BUZZARD_SALES_ENABLED: "0" },
      logAudit: (row) => audits.push(row),
    });
    expect(() => service.assertWrite({ entity: ENTITIES.PRICE, actor: ACTORS.PUSAT })).toThrow(/cannot write/);
    expect(() => service.assertWrite({ entity: ENTITIES.PRODUCT, actor: ACTORS.AI })).toThrow(/cannot write/);
    expect(service.registry.productSotActive).toBe(false);
    expect(service.registry.salesLocked).toBe(true);
    const status = service.adminStatus();
    expect(status.product.owner).toBe("product_engine");
    expect(status.order.owner).toBe("order_engine");
    expect(status.availability.owner).toBe("availability_engine");
    expect(status.price.owner).toBe("pricing_engine");
    expect(JSON.stringify(status)).not.toMatch(/jwt|password|ADMIN_|\/var\/data/i);
    service.product.assertProductWriteAuthority({ actor: ACTORS.PRODUCT_ENGINE });
    service.audit.record({
      result: "accepted",
      entity: ENTITIES.PRICE,
      actor: ACTORS.PRICING_ENGINE,
      operation: "setPrice",
      correlationId: "corr_keep",
    });
    expect(audits.some((row) => row.action === "SOT_WRITE_ACCEPTED" && row.metadata.correlationId === "corr_keep")).toBe(true);
  });

  it("replays matching idempotency keys and conflicts on payload or in-progress", async () => {
    const adapter = createSotIdempotencyAdapter({ commerce: memoryCommerce() });
    let runs = 0;
    const first = await adapter.execute({
      operation: "SOT_PRICE",
      idempotencyKey: "k1",
      payload: { n: 1 },
      execute: async () => {
        runs += 1;
        return { ok: true };
      },
    });
    const replay = await adapter.execute({
      operation: "SOT_PRICE",
      idempotencyKey: "k1",
      payload: { n: 1 },
      execute: async () => {
        runs += 1;
        return { ok: true };
      },
    });
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(runs).toBe(1);
    await expect(
      adapter.execute({
        operation: "SOT_PRICE",
        idempotencyKey: "k1",
        payload: { n: 2 },
        execute: async () => ({ ok: true }),
      })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    adapter.markInProgress("SOT_PRICE", "k-run");
    await expect(
      adapter.execute({
        operation: "SOT_PRICE",
        idempotencyKey: "k-run",
        payload: {},
        execute: async () => ({ ok: true }),
      })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_IN_PROGRESS" });
    adapter.clearInProgress("SOT_PRICE", "k-run");
  });

  it("requires auth and RBAC on the admin SoT route", () => {
    expect(PUBLIC_ROUTES.has("GET /api/admin/system/sot")).toBe(false);
    expect(EXACT["GET /api/admin/system/sot"]).toBe("system.read");
    const unauthorized = { headers: {} };
    const res401 = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    const session = requireAuth(unauthorized, res401);
    expect(session).toBeFalsy();
    expect(res401.statusCode).toBe(401);
    const res403 = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    const denied = requirePermission({ adminUser: { role: "catalog_manager" } }, res403, "system.read");
    expect(denied).toBe(false);
    expect(res403.statusCode).toBe(403);
  });
});
