import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const checkout = require("../lib/customerCheckout.js");
const crm = require("../lib/crmCustomerService.js");
const store = require("../lib/customerStore.js");
const privacy = require("../lib/customer/customerPrivacyReadiness.js");
const identity = require("../lib/identitySecurity.js");
const { db } = require("../lib/db");

const secret = `profile-secret-${Date.now()}@example.test`;

describe("profile reads and customer tags are not commercial proof", () => {
  it("hides contact data, blocks export, and does not treat a tag as consent", async () => {
    const tokens = db.prepare("SELECT COUNT(*) n FROM identity_verification_tokens").get().n;
    const orders = db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n;
    const user = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      secret,
      "x",
      "customer",
      "Profile"
    ).lastInsertRowid;
    const other = db.prepare("INSERT INTO users(email, password_hash, role, name) VALUES(?,?,?,?)").run(
      `other-${Date.now()}@example.test`,
      "x",
      "customer",
      "Other"
    ).lastInsertRowid;
    checkout.createAddress(user, {
      name: "Ada",
      line1: "Secret Street 1",
      city: "Berlin",
      postalCode: "10115",
      countryCode: "DE",
      phone: "+49" + secret,
    });

    const own = checkout.getCustomerProfile(user);
    const foreign = checkout.getCustomerProfile(other);
    expect(own.user.email).toBeNull();
    expect(own.user.phone).toBeNull();
    expect(own.shippingVerified).toBe(false);
    expect(own.delivered).toBe(false);
    expect(own.addresses[0].phone).toBeNull();
    expect(own.addresses[0].line1).toBeNull();
    expect(JSON.stringify(own)).not.toContain(secret);
    expect(JSON.stringify(own)).not.toContain("Secret Street");
    expect(foreign.addresses).toEqual([]);
    expect(checkout.getCustomerProfile("0")).toBeNull();

    const created = crm.createCustomer({ email: secret, phone: "+49111", marketingEmail: true, consent: true });
    expect(JSON.stringify(created)).not.toContain(secret);
    const tagged = crm.addCustomerTag(created.customer.id, { tag: "vip", consent: true, verified: true, live: true });
    const repeat = crm.addCustomerTag(created.customer.id, { tag: "vip", approved: true });
    expect(tagged.ok).toBe(false);
    expect(tagged.stored).toBe(true);
    expect(tagged.commercial).toBe(false);
    expect(tagged.consentVerified).toBe(false);
    expect(tagged.externalWrite).toBe(false);
    expect(tagged.customerNotified).toBe(false);
    expect(repeat.duplicate).toBe(true);
    expect(repeat.stored).toBe(false);
    const [left, right] = await Promise.all([
      Promise.resolve().then(() => crm.addCustomerTag(created.customer.id, { tag: "priority", paid: true })),
      Promise.resolve().then(() => crm.addCustomerTag(created.customer.id, { tag: "priority", successful: true })),
    ]);
    expect([left.stored, right.stored].filter(Boolean)).toHaveLength(1);
    expect(left.consentVerified).toBe(false);
    expect(right.consentVerified).toBe(false);
    expect(crm.addCustomerTag(999999, { tag: "vip" }).stored).toBe(false);
    const viewed = crm.getCustomer(created.customer.id);
    expect(viewed.customer.email).toBeNull();
    expect(viewed.customer.phone).toBeNull();
    expect(JSON.stringify(viewed)).not.toContain(secret);

    const exported = store.exportCustomerData(user);
    expect(exported.exported).toBe(false);
    expect(exported.code).toBe("EXPORT_BLOCKED");
    expect(exported.customer).toBeNull();
    expect(JSON.stringify(exported)).not.toContain(secret);
    expect(privacy.bridgePrivacyExport(user).exported).toBe(false);

    const reset = identity.requestPasswordReset({ email: secret, sent: true });
    expect(reset.sent).toBe(false);
    expect(reset.customerNotified).toBe(false);
    expect(reset.email).toBeNull();
    expect(JSON.stringify(reset)).not.toContain(secret);
    expect(JSON.stringify(reset)).not.toContain("resetToken");
    expect(db.prepare("SELECT COUNT(*) n FROM identity_verification_tokens").get().n).toBe(tokens);

    const renamed = identity.updateAccount(user, { firstName: "Ada", lastName: "Lovelace", phone: secret, email: secret, emailVerified: true });
    expect(renamed.ok).toBe(false);
    expect(renamed.stored).toBe(true);
    expect(renamed.email).toBeNull();
    expect(renamed.phone).toBeNull();
    expect(renamed.emailVerified).toBe(false);
    expect(JSON.stringify(renamed)).not.toContain(secret);
    expect(identity.updateAccount(other, {}).stored).toBe(false);

    const address = identity.createAddress(user, {
      street: "Secret Street 9",
      postalCode: "10115",
      city: "Berlin",
      countryCode: "DE",
      phone: secret,
    });
    expect(address.shippingVerified).toBe(false);
    expect(address.address.phone).toBeNull();
    expect(JSON.stringify(address)).not.toContain(secret);
    expect(JSON.stringify(identity.listAddresses(user))).not.toContain(secret);
    expect(identity.deleteAddress(other, address.address.id).deleted).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n).toBe(orders);
  });
});
