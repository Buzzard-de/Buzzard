import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { db } = require("../lib/db");
const { isSalesEnabled } = require("../lib/salesMode");
const { evaluateSalesGate } = require("../lib/salesSafetyGate");
const { isSotActive, getSotMode } = require("../lib/productSot");
const { capturePayment } = require("../lib/commerce/paymentService");
const { transitionOrderStatus } = require("../lib/commerce/orderService");
const { InterCarsAdapter } = require("../lib/adapters/interCarsAdapter");

const CHILD_FLAGS = [
  "BUZZARD_PRODUCT_SOT_ACTIVE",
  "BUZZARD_PAYMENT_LIVE",
  "BUZZARD_SUPPLIER_LIVE",
  "BUZZARD_FULFILLMENT_LIVE",
  "BUZZARD_TRACKING_LIVE",
  "BUZZARD_RETURN_LIVE",
  "BUZZARD_REFUND_LIVE",
  "BUZZARD_CRITICAL_E2E_PASS",
  "BUZZARD_SECURITY_GATE_PASS",
  "PUSAT_RUNTIME_HEALTHY",
];
const TOUCHED = [
  "BUZZARD_SALES_ENABLED",
  "BUZZARD_SALES_GATE_BYPASS",
  "BUZZARD_PRODUCT_SOT_MODE",
  "BUZZARD_PRODUCT_SOT_EXCLUSIVE",
  "BUZZARD_PRODUCT_SOT_IDENTITY_VALIDATED",
  ...CHILD_FLAGS,
];

const saved = Object.fromEntries(TOUCHED.map((name) => [name, process.env[name]]));

function setFlags(values) {
  for (const name of TOUCHED) delete process.env[name];
  for (const [name, value] of Object.entries(values)) process.env[name] = value;
}

afterEach(() => {
  for (const name of TOUCHED) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

describe("sales parent lock", () => {
  it("ignores child commercial flags while sales are off and does not activate SoT by itself", () => {
    setFlags(Object.fromEntries(CHILD_FLAGS.map((name) => [name, "1"])));
    process.env.BUZZARD_PRODUCT_SOT_MODE = "EXCLUSIVE";

    expect(isSalesEnabled()).toBe(false);
    expect(evaluateSalesGate().allowed).toBe(false);
    expect(isSotActive()).toBe(false);
    expect(getSotMode().mode).toBe("READ_TARGET");
    expect(getSotMode().blockedReason).toBe("BLOCKED_BY_PRODUCTION_ACCESS");

    const id = "ord_child_flag_probe";
    db.prepare("INSERT OR REPLACE INTO commerce_orders (id, status, order_type) VALUES (?, 'PAYMENT_PENDING', 'DRY_RUN')").run(id);
    const paid = transitionOrderStatus(id, "PAID", { actorId: "child-flag-probe" });
    expect(paid.code).toBe("PAYMENT_NOT_LIVE");
    expect(db.prepare("SELECT status FROM commerce_orders WHERE id = ?").get(id).status).toBe("PAYMENT_PENDING");
    db.prepare("DELETE FROM commerce_orders WHERE id = ?").run(id);

    const capture = capturePayment({ actorId: "child-flag-probe" });
    expect(capture.code).toBe("PAYMENT_NOT_LIVE");
    expect(capture.realMoneyMovement).toBe(false);
    expect(new InterCarsAdapter().placeOrder({ actorId: "child-flag-probe" }).code).toBe("LIVE_ORDER_FORBIDDEN");
  });

  it("keeps payment and supplier orders closed when every sales flag is turned on", () => {
    setFlags({
      BUZZARD_SALES_ENABLED: "1",
      ...Object.fromEntries(CHILD_FLAGS.map((name) => [name, "1"])),
    });

    expect(evaluateSalesGate().status).toBe("READY");
    expect(isSalesEnabled()).toBe(true);
    expect(isSotActive()).toBe(false);

    const capture = capturePayment({ actorId: "sales-open-attempt" });
    expect(capture.code).toBe("PAYMENT_NOT_LIVE");
    expect(capture.captured).toBe(false);
    expect(new InterCarsAdapter().placeOrder({ actorId: "sales-open-attempt" })).toMatchObject({
      code: "LIVE_ORDER_FORBIDDEN",
      live: false,
      orderCreated: false,
    });
  });
});
