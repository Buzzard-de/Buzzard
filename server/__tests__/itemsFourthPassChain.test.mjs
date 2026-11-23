import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

process.env.BUZZARD_DB_PATH = path.join(os.tmpdir(), `buzzard-chain-${process.pid}.sqlite`);
process.env.BUZZARD_SALES_ENABLED = "0";

const require = createRequire(import.meta.url);
const { traceCommerce } = require("../lib/software");
const { createDigitalBodyEngine } = require("../lib/buzzardNative/engines/digitalBody");

describe("fourth pass commercial chain", () => {
  it("walks product price stock order payment supplier shipping and customer without money", () => {
    const chain = traceCommerce({ orderId: "dry-chain", supplierCost: 10, idempotencyKey: `chain-${process.pid}` });
    expect(chain.salesEnabled).toBe(false);
    expect(chain.orchestrator).toBe(false);
    expect(chain.decides).toBe(false);
    expect(chain.price.recommendationOnly).toBe(true);
    expect(chain.price.currency).toBe("EUR");
    expect(chain.price.amount).toBeGreaterThan(10);
    expect(chain.priceWrite.ok).toBe(false);
    expect(chain.priceWrite.code).toBe("AI_PRICE_WRITE_DENIED");
    expect(chain.stock.sellable).toBe(false);
    expect(chain.stock.liveSupplierApi).toBe(false);
    expect(chain.stockBuy.code).toBe("HUMAN_GATE_REQUIRED");
    expect(chain.identity.payable).toBe(false);
    expect(chain.identity.qr.paymentUrl).toBeNull();
    expect(chain.amountMatchesIdentity).toBe(true);
    expect(chain.payment.code).toBe("PAYMENT_NOT_LIVE");
    expect(chain.payment.realMoneyMovement).toBe(false);
    expect(chain.shipping.dryRun).toBe(true);
    expect(chain.shipping.shipmentCreated).toBe(false);
    expect(chain.vat.rate).toBe(19);
    expect(chain.supplier.blocked).toBe(true);
    expect(chain.supplier.order.orderCreated).toBe(false);
    expect(chain.listings.length).toBeGreaterThan(0);
    expect(chain.listings.every((row) => row.live === false && row.ok === false)).toBe(true);
    expect(chain.idempotency.firstOrderCreated).toBe(false);
    expect(chain.idempotency.conflict).toBe("ORDER_IDEMPOTENCY_CONFLICT");
    expect(chain.returns.customerRefundIssued).toBe(false);
    expect(chain.returns.supplierRefundReceived).toBe(false);
    expect(chain.returns.labelIssued).toBe(false);
    expect(chain.customer.realOrdersEnabled).toBe(false);
  });

  it("shares one digital body engine and does not claim speech animation", () => {
    const sinan = createDigitalBodyEngine();
    const other = createDigitalBodyEngine({ agentId: "amelia", avatar: "/council/amelia.png", voiceId: "amelia-voice" });
    sinan.initialize();
    other.initialize();
    const sinanState = sinan.execute({ op: "state" });
    const otherState = other.execute({ op: "state" });
    expect(sinanState.sharedEngine).toBe("digital_body");
    expect(otherState.sharedEngine).toBe("digital_body");
    expect(sinanState.agentId).not.toBe(otherState.agentId);
    expect(sinanState.avatar).not.toBe(otherState.avatar);
    expect(sinanState.ttsReady).toBe(false);
    expect(sinanState.animation).toBe(false);
    expect(sinanState.lipSync).toBe(false);
    expect(sinan.execute({ op: "lip_sync" }).lipSyncPass).toBe(false);
    expect(other.execute({ op: "animate" }).ok).toBe(false);
  });
});
