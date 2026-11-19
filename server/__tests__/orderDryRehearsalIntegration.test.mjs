import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import { ALL_ROLES, startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);

describe("ordersPlugin ↔ orderManagementOrchestrator dry rehearsal", () => {
  /** @type {Awaited<ReturnType<typeof startIsolatedApi>>} */
  let api;

  beforeAll(async () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1", BUZZARD_DB_ENABLED: "0" } });
  }, 120_000);

  afterAll(async () => {
    if (api) await api.stop();
  }, 30_000);

  it("POST /api/orders/dry-rehearsal runs checkout pipeline without sales", async () => {
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
    const res = await api.request("POST", "/api/orders/dry-rehearsal", { body });
    expect(res.status, res.text).toBe(200);
    const json = res.json || {};
    expect(json.rehearsal).toBe(true);
    expect(json.live).toBe(false);
    expect(json.result?.salesLocked).toBe(true);
    expect(json.result?.pipeline?.live).toBe(false);
    expect(json.result?.supplierAdapter?.live).toBe(false);
  }, 60_000);
});