import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const inventory = require("../lib/commerce/inventoryIntegration.js");
const productService = require("../lib/productService.js");
const priceStock = require("../lib/priceStockQueue.js");
const supplierHub = require("../lib/supplierHub.js");
const supplierIntegration = require("../lib/supplierIntegrationHub.js");
const fulfillment = require("../lib/fulfillmentPipeline.js");
const orders = require("../lib/orderManagement.js");
const cartCheckout = require("../lib/cartCheckout.js");
const { db } = require("../lib/db");

function product() {
  return productService.createProduct({
    sku: `RSV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    title: "Reserve product",
    price: 12,
    stock: 4,
  });
}

describe("stock reservation stays closed", () => {
  it("refuses a direct reserve and keeps the first code with the remaining reasons", () => {
    const item = product();
    const before = db.prepare("SELECT COUNT(*) n FROM inventory_sot_reservations").get().n;
    const result = inventory.reserve({
      productId: item.id,
      quantity: 1,
      live: true,
      verified: true,
      approved: true,
      available: true,
      mock: true,
    });
    const after = db.prepare("SELECT COUNT(*) n FROM inventory_sot_reservations").get().n;
    expect(result.ok).toBe(false);
    expect(result.code).toBe("SALES_CLOSED");
    expect(result.reasons[0]).toBe("SALES_CLOSED");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "ORDER_UNVERIFIED",
        "STOCK_UNVERIFIED",
        "SUPPLIER_COST_UNVERIFIED",
        "STALE_STOCK",
        "MOCK_STOCK",
      ])
    );
    expect(result.created).toBe(false);
    expect(result.purchased).toBe(false);
    expect(result.stockDecremented).toBe(false);
    expect(result.callerFlagIgnored).toBe(true);
    expect(after).toBe(before);
    expect(productService.getProduct(item.id).stock).toBe(4);
  });

  it("does not create a second reservation for the same order", () => {
    const item = product();
    const key = `key-${item.sku}`;
    db.prepare(
      `INSERT INTO inventory_sot_reservations(id, product_id, sku, quantity, status, correlation_id, idempotency_key)
       VALUES (?, ?, ?, 1, 'RESERVED', ?, ?)`
    ).run(`rsv-${item.sku}`, item.id, item.sku, `order-${item.sku}`, key);
    const result = inventory.reserve({
      productId: item.id,
      quantity: 1,
      orderId: `order-${item.sku}`,
      idempotencyKey: key,
    });
    const rows = db.prepare("SELECT COUNT(*) n FROM inventory_sot_reservations WHERE idempotency_key = ?").get(key).n;
    expect(result.code).toBe("DUPLICATE_RESERVATION");
    expect(result.duplicate).toBe(true);
    expect(result.created).toBe(false);
    expect(rows).toBe(1);
  });

  it("releases only a local row and does not expire, decrement, or buy stock", () => {
    const item = product();
    const reservationId = `rsv-release-${item.sku}`;
    db.prepare(
      `INSERT INTO inventory_sot_reservations(id, product_id, sku, quantity, status, idempotency_key)
       VALUES (?, ?, ?, 2, 'RESERVED', ?)`
    ).run(reservationId, item.id, item.sku, `key-release-${item.sku}`);
    const released = inventory.release(reservationId);
    const expired = inventory.expireReservations();
    const decremented = inventory.decrementStock({ productId: item.id, quantity: 2, approved: true });
    const row = db.prepare("SELECT status FROM inventory_sot_reservations WHERE id = ?").get(reservationId);
    expect(released.code).toBe("RESERVATION_RELEASED");
    expect(released.purchased).toBe(false);
    expect(released.stockDecremented).toBe(false);
    expect(expired.code).toBe("RESERVATION_EXPIRY_UNVERIFIED");
    expect(expired.expired).toBe(0);
    expect(row.status).toBe("RELEASED");
    expect(decremented.code).toBe("STOCK_UNVERIFIED");
    expect(decremented.decremented).toBe(false);
    expect(productService.getProduct(item.id).stock).toBe(4);
    expect(inventory.release("missing").code).toBe("RESERVATION_NOT_FOUND");
  });

  it("blocks stock sync, supplier confirmation, cancellation, split, and fulfillment", () => {
    const sync = priceStock.applyPriceStockUpdate({
      productId: "p",
      supplierPrice: { amount: 5, currency: "EUR" },
      stock: 9,
      live: true,
    });
    expect(sync.code).toBe("STOCK_UNVERIFIED");
    expect(sync.applied).toBe(false);
    expect(sync.purchased).toBe(false);

    const supplier = db.prepare("INSERT INTO suppliers(code, name) VALUES (?, ?)").run(`sup-${Date.now()}`, "Synthetic");
    const before = db.prepare("SELECT COUNT(*) n FROM supplier_products").get().n;
    const feed = supplierHub.syncSupplierFeed(supplier.lastInsertRowid, {
      payload: [{ sku: "A", stock: 8, cost: 3, name: "Pad" }],
      verified: true,
    });
    const productWrite = supplierHub.upsertSupplierProduct(supplier.lastInsertRowid, {
      supplierSku: "A",
      name: "Pad",
      stock: 8,
      cost: 3,
    });
    const queued = supplierHub.queueSupplierSyncAll();
    expect(feed.stored).toBe(false);
    expect(productWrite.stored).toBe(false);
    expect(queued.queued).toBe(0);
    expect(db.prepare("SELECT COUNT(*) n FROM supplier_products").get().n).toBe(before);

    const code = `sih-${Date.now()}`;
    db.prepare("INSERT INTO supih_suppliers(code, name) VALUES (?, ?)").run(code, "Synthetic");
    const jobsBefore = db.prepare("SELECT COUNT(*) n FROM supih_sync_jobs").get().n;
    const snapshotsBefore = db.prepare("SELECT COUNT(*) n FROM supih_product_snapshots").get().n;
    const job = supplierIntegration.queueSync(code, { jobType: "stock", approved: true });
    const snapshot = supplierIntegration.addSnapshot(code, { supplierSku: "A", stock: 8, price: 3, mock: true });
    expect(job.accepted).toBe(false);
    expect(job.queued).toBe(false);
    expect(snapshot.stored).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM supih_sync_jobs").get().n).toBe(jobsBefore);
    expect(db.prepare("SELECT COUNT(*) n FROM supih_product_snapshots").get().n).toBe(snapshotsBefore);

    const order = db
      .prepare("INSERT INTO oms_orders(order_number, grand_total) VALUES (?, 10)")
      .run(`ord-${Date.now()}`);
    const cancelled = orders.cancelOrder(order.lastInsertRowid);
    const split = orders.splitOrder(order.lastInsertRowid, { approved: true });
    const status = db.prepare("SELECT order_status FROM oms_orders WHERE id = ?").get(order.lastInsertRowid);
    expect(cancelled.code).toBe("CANCELLATION_UNVERIFIED");
    expect(cancelled.cancelled).toBe(false);
    expect(split.code).toBe("ORDER_UNVERIFIED");
    expect(split.orderCreated).toBe(false);
    expect(status.order_status).toBe("pending");

    const prepared = fulfillment.createFulfillmentsForOrder({ orderNumber: `ff-${Date.now()}`, mock: true });
    expect(prepared[0].blocked).toBe(true);
    expect(prepared[0].code).toBe("SALES_CLOSED");
    expect(prepared[0].reasons).toEqual(expect.arrayContaining(["STOCK_UNVERIFIED", "MOCK_NOT_COMMERCIAL"]));
  });

  it("does not store a legacy cart line or mark checkout ready for payment", () => {
    const created = cartCheckout.createCart({ country: "DE" });
    const before = db.prepare("SELECT COUNT(*) n FROM cc_cart_items").get().n;
    const added = cartCheckout.addCartItem(created.cartToken, { sku: "PAD", quantity: 2, unitPrice: 5, available: true });
    const done = cartCheckout.completeCheckoutSession("missing-token");
    expect(added.code).toBe("STOCK_UNVERIFIED");
    expect(added.stored).toBe(false);
    expect(added.purchased).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM cc_cart_items").get().n).toBe(before);
    expect(done.error).toBeTruthy();
    expect(done.ok).not.toBe(true);
  });
});
