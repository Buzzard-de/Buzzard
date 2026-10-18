import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("core runway infrastructure — established fail-closed", () => {
  it("enforces commerce transitions, catalog mode, and public errors without stacks", () => {
    const { coreRunwayIntegrity } = require("../lib/software");
    const inspect = coreRunwayIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.catalogMode).toBe(true);
    expect(inspect.commerceMode).toBe(false);
    expect(inspect.productSourceOfTruthActive).toBe(false);
    expect(inspect.dualWrite).toBe(false);
    expect(inspect.productionMigrated).toBe(false);
    expect(inspect.live).toBe(false);
    expect(inspect.idempotencyHeaderAllowed).toBe(true);

    const tr = coreRunwayIntegrity.assertIllegalTransitions();
    expect(tr.checkoutCompletedToDraft).toBe(false);
    expect(tr.checkoutCancelledToReady).toBe(false);
    expect(tr.orderDeliveredToPending).toBe(false);
    expect(tr.orderCancelledToPaid).toBe(false);
    expect(tr.checkoutDraftToValidating).toBe(true);
    expect(tr.orderPendingToCancelled).toBe(true);

    const leaked = coreRunwayIntegrity.publicErrorFromLeak(
      new Error("EACCES /etc/passwd stack at /var/data/buzzard.db"),
    );
    expect(leaked.hasStack).toBe(false);
    expect(leaked.hasMessage).toBe(false);
    expect(leaked.leakedPath).toBe(false);
    expect(leaked.errorKey).toBe("security.internalError");
    const plugin = coreRunwayIntegrity.pluginError({ message: "disk full at /var/data" }, "plugin.failed");
    expect(plugin.errorKey).toBe("plugin.failed");
    expect(JSON.stringify(plugin)).not.toContain("/var/data");

    const mode = coreRunwayIntegrity.catalogVersusCommerce();
    expect(mode.salesEnabled).toBe(false);
    expect(mode.catalogMode).toBe(true);
    expect(mode.commerceLocked).toBe(true);
    expect(mode.errorKeyOnly).toBe(true);
    expect(mode.liveOrder).toBe(false);
  });

  it("strips guest tokens, keeps PIM contract local, and refuses production migrate", () => {
    const { coreRunwayIntegrity } = require("../lib/software");
    const guest = coreRunwayIntegrity.stripGuestFromOrder({
      id: "ord_runway",
      checkout_id: "chk_1",
      customer_id: "cust_1",
      order_type: "DRY_RUN",
      status: "PENDING",
      payment_status: "NONE",
      fulfillment_status: "NONE",
      currency: "EUR",
      subtotal: 0,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 0,
      items_json: "[]",
      metadata_json: JSON.stringify({ guestToken: "gst_secret", note: "ok" }),
      created_at: "2026-10-18T00:00:00Z",
    });
    expect(guest.hasGuestToken).toBe(false);
    expect(guest.mapped.metadata.note).toBe("ok");
    expect(JSON.stringify(guest.mapped)).not.toContain("gst_secret");

    const product = coreRunwayIntegrity.productContract();
    expect(product.fieldsPresent).toBe(true);
    expect(product.sotActive).toBe(false);
    expect(product.dualWrite).toBe(false);
    expect(product.livePriceInvented).toBe(false);

    const local = coreRunwayIntegrity.migrateLocal();
    expect(local.ok).toBe(true);
    expect(local.production).toBe(false);
    expect(local.tables).toEqual(expect.arrayContaining(["software_reservations", "software_shipments"]));
    const prod = coreRunwayIntegrity.migrateProduction();
    expect(prod.migrated).toBe(false);
    expect(prod.restoreExecuted).toBe(false);
    expect(prod.reason).toBe("PRODUCTION_MIGRATE_HUMAN");
  });

  it("replays idempotency, sanitizes correlation ids, separates health bucket, fail-closes unregistered writes", () => {
    const { coreRunwayIntegrity } = require("../lib/software");
    const idemp = coreRunwayIntegrity.replayIdempotency();
    expect(idemp.replay).toBe(true);
    expect(idemp.replaySameId).toBe(true);
    expect(idemp.conflict).toBe(true);

    const corr = coreRunwayIntegrity.probeCorrelation();
    expect(corr.rejected).toBe(true);
    expect(corr.requestHeader).toBe(true);
    expect(corr.correlationHeader).toBe(true);
    expect(corr.productionProbed).toBe(false);

    const health = coreRunwayIntegrity.healthBuckets();
    expect(health.separate).toBe(true);
    expect(health.healthPrefix).not.toBe(health.apiPrefix);
    expect(health.productionLoad).toBe(false);

    const unreg = coreRunwayIntegrity.unregisteredWrite();
    expect(unreg.unregisteredNotExecuted).toBe(true);
    expect(unreg.status).toBe(401);
    expect(unreg.errorKey).toBe("admin.auth.required");
  });
});
