import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const support = require("../lib/customerSupport.js");
const checkout = require("../lib/customerCheckout.js");
const crm = require("../lib/crmCustomerService.js");
const ai = require("../lib/aiChatService.js");
const phone = require("../lib/phoneAssistantService.js");
const { db } = require("../lib/db");

const secret = `support-secret-${Date.now()}@example.test`;

function counts() {
  return {
    notifications: db.prepare("SELECT COUNT(*) n FROM notifications").get().n,
    coupons: db.prepare("SELECT COUNT(*) n FROM coupons").get().n,
    ledger: db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_ledger").get().n,
    orders: db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n,
    tracking: db.prepare("SELECT COUNT(*) n FROM tracking_events").get().n,
  };
}

describe("a stored support message is not a delivery", () => {
  it("keeps local tickets undelivered and does not expose another customer", async () => {
    const before = counts();
    const user = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      `support-${Date.now()}@example.test`,
      "x",
      "customer",
      "Support"
    ).lastInsertRowid;
    const other = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      `other-${Date.now()}@example.test`,
      "x",
      "customer",
      "Other"
    ).lastInsertRowid;

    const ticket = support.createTicket(user, {
      subject: "Help",
      message: `Please call ${secret}`,
      orderNumber: "BZ-FAKE",
      paid: true,
      delivered: true,
      email: secret,
    });
    expect(ticket.ok).toBe(false);
    expect(ticket.stored).toBe(true);
    expect(ticket.sent).toBe(false);
    expect(ticket.delivery).toBe("BLOCKED_EXTERNAL");
    expect(ticket.customerNotified).toBe(false);
    expect(ticket.orderLinked).toBe(false);
    expect(JSON.stringify(ticket)).not.toContain(secret);
    expect(db.prepare("SELECT order_number FROM tickets WHERE id = ?").get(ticket.id).order_number).toBeNull();

    db.prepare("UPDATE tickets SET status = 'closed' WHERE id = ?").run(ticket.id);
    const first = support.addCustomerMessage(user, ticket.id, `Again ${secret}`);
    const second = support.addCustomerMessage(user, ticket.id, `Again ${secret}`);
    expect(first.stored).toBe(true);
    expect(first.sent).toBe(false);
    expect(first.customerNotified).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.stored).toBe(false);
    expect(db.prepare("SELECT status FROM tickets WHERE id = ?").get(ticket.id).status).toBe("closed");
    const [left, right] = await Promise.all([
      Promise.resolve().then(() => support.addCustomerMessage(user, ticket.id, `Pair ${secret}`)),
      Promise.resolve().then(() => support.addCustomerMessage(user, ticket.id, `Pair ${secret}`)),
    ]);
    expect(left.sent).toBe(false);
    expect(right.sent).toBe(false);
    expect([left.stored, right.stored].filter(Boolean)).toHaveLength(1);
    expect(support.getUserTicket(other, ticket.id)).toBeNull();
    const tracking = support.listOrderTracking("BZ-FAKE", other);
    expect(tracking.events).toEqual([]);
    expect(tracking.code).toBe("ORDER_UNVERIFIED");
    expect(tracking.delivered).toBe(false);
    expect(JSON.stringify(tracking)).not.toContain(secret);

    const created = crm.createCustomer({
      email: secret,
      phone: "+491234",
      marketingEmail: true,
      marketingSms: true,
      consent: true,
    });
    expect(created.customer.marketing_email).toBe(0);
    expect(created.customer.marketing_sms).toBe(0);
    expect(created.email).toBeNull();
    expect(JSON.stringify(created)).not.toContain(secret);
    const updated = crm.updateCustomer(created.customer.id, { marketingEmail: true, phone: "+491234", email: secret });
    expect(updated.customer.marketing_email).toBe(0);
    expect(updated.customer.email).toBeNull();
    expect(JSON.stringify(updated)).not.toContain(secret);

    const crmTicket = crm.createTicket({
      subject: "CRM",
      message: `Agent note ${secret}`,
      customerId: created.customer.id,
      orderNumber: "BZ-FAKE",
      verified: true,
      live: true,
    });
    expect(crmTicket.sent).toBe(false);
    expect(crmTicket.delivery).toBe("BLOCKED_EXTERNAL");
    expect(crmTicket.orderLinked).toBe(false);
    expect(JSON.stringify(crmTicket)).not.toContain(secret);
    const reply = crm.addTicketMessage(crmTicket.ticket.id, { message: `Hello ${secret}`, senderName: secret, live: true });
    const repeat = crm.addTicketMessage(crmTicket.ticket.id, { message: `Hello ${secret}`, sent: true });
    expect(reply.stored).toBe(true);
    expect(reply.customerNotified).toBe(false);
    expect(repeat.duplicate).toBe(true);
    expect(JSON.stringify(reply)).not.toContain(secret);
    const status = crm.updateTicket(crmTicket.ticket.id, { status: "resolved", orderNumber: "BZ-FAKE", paid: true });
    expect(status.stored).toBe(false);
    expect(status.customerNotified).toBe(false);
    const viewed = crm.getTicket(db.prepare("SELECT ticket_number FROM crmcs_tickets WHERE id = ?").get(crmTicket.ticket.id).ticket_number);
    expect(viewed.ticket.customer_email).toBeNull();
    expect(JSON.stringify(viewed)).not.toContain(secret);

    const chat = ai.handleMessage({ message: `Where is order BZ-100 ${secret}`, customerEmail: secret, locale: "en" });
    expect(chat.order).toBeNull();
    expect(chat.sent).toBe(false);
    expect(chat.customerNotified).toBe(false);
    expect(chat.delivery).toBe("BLOCKED_EXTERNAL");
    expect(JSON.stringify(chat)).not.toContain(secret);
    const lookedUp = phone.verifyOrderAccess({ orderNumber: "BZ-100", email: secret, postalCode: "10115" });
    expect(lookedUp.ok).toBe(false);
    expect(lookedUp.verified).not.toBe(true);
    expect(JSON.stringify(lookedUp)).not.toContain(secret);

    const address = checkout.createAddress(user, {
      name: "Ada",
      line1: "Street 1",
      city: "Berlin",
      postalCode: "10115",
      countryCode: "DE",
      phone: secret,
    });
    expect(address.stored).toBe(true);
    expect(address.shippingVerified).toBe(false);
    expect(address.delivered).toBe(false);
    expect(address.address.phone).toBeNull();
    expect(JSON.stringify(address)).not.toContain(secret);
    const removed = checkout.deleteAddress(other, address.address.id);
    expect(removed.deleted).toBe(false);
    expect(removed.shipmentCancelled).toBe(false);
    const wish = checkout.addWishlistItem(user, "sku-1");
    expect(wish.reserved).toBe(false);
    expect(wish.orderCreated).toBe(false);
    const read = checkout.markNotificationRead(user, 1);
    expect(read.read).toBe(false);
    expect(read.delivery).toBe("BLOCKED_EXTERNAL");

    const after = counts();
    expect(after).toEqual(before);
  });
});
