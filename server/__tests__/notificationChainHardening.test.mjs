import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const engine = require("../lib/notificationEngine.js");
const { deliverNotification } = require("../lib/notificationHub.js");

const commerceDb = path.join(__dirname, "..", "data", "buzzard.db");
const workspaceDb = "/workspace/server/data/buzzard.db";

function statOf(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

describe("notification chain hardening", () => {
  const commerceBefore = statOf(commerceDb);
  const workspaceBefore = statOf(workspaceDb);

  afterEach(() => {
    engine.unbindOrderRepository();
    engine.unbindOperationalRepository();
  });

  it("authorizes a recorded order and still does not send", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-chain-order-"));
    const orders = engine.openIsolatedOrderFixture(path.join(directory, "orders.sqlite"));
    orders.insertOrder({
      orderNumber: "BZ-REAL",
      customerId: "cust-real",
      status: "placed",
      purpose: "order_status",
    });
    const decision = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      channel: "email",
      email: "buyer@example.test",
      orderVerified: false,
    }, "new_order");
    expect(decision.ok).toBe(true);
    expect(decision.reason).toBe("transactional_authorized");
    expect(decision.sent).toBe(false);
    expect(decision.productionReady).toBe(false);
    expect(decision.salesOpen).toBe(false);
    expect(decision.egress).toBe("DENY");

    const notice = engine.prepareCustomerNotice({
      idempotencyKey: "verified-order",
      eventType: "new_order",
      channel: "email",
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      orderVerified: false,
      email: "buyer@example.test",
    });
    expect(notice.code).toBe("NOTIFICATION_NOT_LIVE");
    expect(notice.sent).toBe(false);
    expect(notice.queued).toBe(false);
    expect(notice.live).toBe(false);
    expect(notice.productionReady).toBe(false);
    expect(notice.salesOpen).toBe(false);
    expect(notice.egress).toBe("DENY");
    expect(JSON.stringify(notice)).not.toContain("buyer@example.test");
    const repeat = deliverNotification({
      channel: "email",
      kind: "order_status",
      idempotencyKey: "hub:verified-order:1",
    });
    expect(repeat.duplicate).toBe(true);
    expect(repeat.sent).toBe(false);
    orders.close();
  });

  it("denies a missing order, the wrong customer, the wrong status, and a fake verified flag", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-chain-deny-"));
    const orders = engine.openIsolatedOrderFixture(path.join(directory, "orders.sqlite"));
    orders.insertOrder({
      orderNumber: "BZ-REAL",
      customerId: "cust-real",
      status: "placed",
      purpose: "order_status",
    });
    const missing = engine.prepareCustomerNotice({
      idempotencyKey: "missing-order",
      eventType: "new_order",
      customerId: "cust-real",
      orderNumber: "BZ-NONE",
      orderVerified: true,
      channel: "email",
    });
    expect(missing.code).toBe("order_not_found");
    expect(missing.sent).toBe(false);

    const wrongCustomer = engine.prepareCustomerNotice({
      idempotencyKey: "wrong-customer",
      eventType: "new_order",
      customerId: "cust-other",
      orderCustomerId: "cust-other",
      orderNumber: "BZ-REAL",
      verified: true,
      channel: "email",
    });
    expect(wrongCustomer.code).toBe("customer_order_mismatch");

    const wrongStatus = engine.prepareCustomerNotice({
      idempotencyKey: "wrong-status",
      eventType: "order_shipped",
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      shipmentVerified: true,
      channel: "email",
    });
    expect(wrongStatus.code).toBe("order_status_mismatch");
    orders.close();
    engine.unbindOrderRepository();

    const claimed = engine.prepareCustomerNotice({
      idempotencyKey: "fake-verified",
      eventType: "new_order",
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      orderVerified: true,
      verified: true,
      channel: "email",
    });
    expect(claimed.code).toBe("repository_unavailable");
    expect(claimed.sent).toBe(false);
    const probe = deliverNotification({
      channel: "email",
      kind: "order_status",
      idempotencyKey: "hub:fake-verified:1",
    });
    expect(probe.duplicate).not.toBe(true);
    expect(probe.sent).toBe(false);
  });

  it("does not let marketing or an unknown event reach the hub", () => {
    const marketing = engine.prepareCustomerNotice({
      idempotencyKey: "marketing-notice",
      eventType: "review_request",
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      orderVerified: true,
      marketingConsent: true,
      channel: "email",
      email: "buyer@example.test",
    });
    expect(marketing.code).toBe("transactional_not_marketing");
    expect(marketing.sent).toBe(false);
    const unknown = engine.prepareCustomerNotice({
      idempotencyKey: "unknown-notice",
      eventType: "unknown_promo",
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      orderVerified: true,
      channel: "email",
    });
    expect(unknown.code).toBe("unknown_event_type");
    const marketingProbe = deliverNotification({
      channel: "email",
      kind: "general",
      idempotencyKey: "hub:marketing-notice:1",
    });
    expect(marketingProbe.duplicate).not.toBe(true);
    expect(marketingProbe.sent).toBe(false);
  });

  it("denies operational notices that rely on a fake fact, a closed source, or an unknown event", () => {
    const claimed = engine.canSend({
      sourceId: "sku-1",
      channel: "email",
      email: "ops@example.test",
      stockVerified: true,
      verified: true,
    }, "low_stock");
    expect(claimed.ok).toBe(false);
    expect(claimed.reason).toBe("repository_unavailable");
    expect(claimed.sent).toBe(false);
    expect(claimed.productionReady).toBe(false);
    expect(claimed.salesOpen).toBe(false);
    expect(claimed.egress).toBe("DENY");

    engine.bindOperationalRepository({
      readSource() {
        throw new Error("source down");
      },
    });
    const down = engine.canSend({
      sourceId: "sku-1",
      channel: "email",
      email: "ops@example.test",
      stockVerified: true,
    }, "low_stock");
    expect(down.ok).toBe(false);
    expect(down.reason).toBe("repository_unavailable");
    engine.unbindOperationalRepository();

    const unknown = engine.canSend({
      sourceId: "sku-1",
      channel: "email",
      email: "ops@example.test",
      stockVerified: true,
    }, "stock_promo");
    expect(unknown.ok).toBe(false);
    expect(unknown.reason).toBe("unknown_event_type");

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-chain-ops-"));
    const sources = engine.openIsolatedOperationalFixture(path.join(directory, "ops.sqlite"));
    sources.insertSource({
      sourceId: "sku-1",
      eventType: "low_stock",
      status: "low",
      purpose: "inventory_alert",
    });
    const marketed = engine.canSend({
      sourceId: "sku-1",
      channel: "email",
      email: "ops@example.test",
      stockVerified: true,
      marketingConsent: true,
    }, "low_stock");
    expect(marketed.ok).toBe(false);
    expect(marketed.reason).toBe("operational_not_marketing");

    const recorded = engine.canSend({
      sourceId: "sku-1",
      channel: "email",
      email: "ops@example.test",
      stockVerified: false,
    }, "low_stock");
    expect(recorded.ok).toBe(true);
    expect(recorded.reason).toBe("operational_authorized");
    expect(recorded.sent).toBe(false);
    expect(recorded.live).toBe(false);
    expect(recorded.productionReady).toBe(false);
    expect(recorded.salesOpen).toBe(false);
    expect(recorded.egress).toBe("DENY");

    const customerPath = engine.prepareCustomerNotice({
      idempotencyKey: "ops-as-customer",
      eventType: "low_stock",
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      stockVerified: true,
      channel: "email",
    });
    expect(customerPath.code).toBe("operational_not_customer_notice");
    expect(customerPath.sent).toBe(false);
    sources.close();
    expect(statOf(commerceDb)).toEqual(commerceBefore);
    expect(statOf(workspaceDb)).toEqual(workspaceBefore);
  });
});
