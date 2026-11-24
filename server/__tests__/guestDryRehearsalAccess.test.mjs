import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const stranger = `stranger-${randomBytes(4).toString("hex")}@private.example`;
const body = {
  rehearsalCatalogBypass: true,
  lines: [{ productId: "dry-rehearsal", qty: 1, sku: "DRY-SKU-001", title: "Brake pad", unitPrice: 40, stock: 12 }],
  customer: { email: "rehearsal@example.com", name: "Test User" },
  shippingAddress: { name: "Test", street: "S 1", city: "Berlin", postalCode: "10115", country: "DE" },
  billingSameAsShipping: true,
  paymentProvider: "stripe",
  acceptTerms: true,
  acceptPrivacy: true,
};

describe("guest dry rehearsal stays closed", () => {
  let api;

  beforeAll(async () => {
    api = await startIsolatedApi({
      roles: ["administrator"],
      env: { BUZZARD_SALES_ENABLED: "0", BUZZARD_TEST_MODE: "1", BUZZARD_DB_ENABLED: "0" },
    });
    writeFileSync(
      path.join(api.dataDir, "orders.json"),
      JSON.stringify([
        {
          orderNumber: "BZ-PRIVATE-1",
          customer: { email: stranger, firstName: "Private", lastName: "Customer" },
          shippingAddress: { street: "Hidden 9" },
          status: "paid",
        },
      ])
    );
  }, 60_000);

  afterAll(async () => {
    await api?.stop();
  });

  it("gives a guest no rehearsal, no stored customer, and no commercial order", async () => {
    const rehearsal = await api.request("POST", "/api/orders/dry-rehearsal", { body });
    expect(rehearsal.status).toBe(401);
    expect(rehearsal.json).toMatchObject({ success: false, errorKey: "auth_required", live: false, rehearsal: false });
    expect(rehearsal.text).not.toContain(stranger);
    expect(rehearsal.text).not.toContain("Hidden 9");

    const forged = await api.request("POST", "/api/orders/dry-rehearsal", {
      headers: { Authorization: "Bearer not-a-session" },
      body,
    });
    expect(forged.status).toBe(401);
    expect(forged.text).not.toContain(stranger);

    const read = await api.request("GET", "/api/orders/BZ-PRIVATE-1");
    expect(read.status).toBe(401);
    expect(read.text).not.toContain(stranger);

    const commercial = await api.request("POST", "/api/orders", { body });
    expect(commercial.status).toBe(403);
    expect(commercial.json.code).toBe("sales_disabled");
    expect(commercial.text).not.toContain(stranger);
  });

  it("keeps a signed rehearsal non-live and away from another customer's order", async () => {
    const token = await api.login("administrator");
    const rehearsal = await api.request("POST", "/api/orders/dry-rehearsal", { token, body });
    expect(rehearsal.status).toBe(200);
    expect(rehearsal.json.live).toBe(false);
    expect(rehearsal.json.result.live).toBe(false);
    expect(rehearsal.json.result.paymentCapture).toBe(false);
    expect(rehearsal.json.result.salesLocked).toBe(true);
    expect(rehearsal.text).not.toContain(stranger);

    const db = new Database(path.join(api.root, "catalog.sqlite"), { readonly: true });
    const types = db.prepare("SELECT DISTINCT order_type FROM commerce_orders").all().map((row) => row.order_type);
    const captured = db.prepare("SELECT COUNT(*) n FROM commerce_orders WHERE metadata_json LIKE '%\"captured\":true%'").get().n;
    db.close();
    expect(types.every((type) => type !== "COMMERCIAL")).toBe(true);
    expect(captured).toBe(0);

    const hidden = await api.request("GET", "/api/orders/BZ-PRIVATE-1", {
      headers: { Authorization: "Bearer not-a-session" },
    });
    expect(hidden.status).toBe(401);
    expect(hidden.text).not.toContain(stranger);
  });
});
