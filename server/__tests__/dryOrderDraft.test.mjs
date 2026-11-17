import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);
const { validateEan } = require("../lib/productValidator.js");
const { runCommercialDryRun, DECISIONS } = require("../lib/commerce/commercialCore.js");
const {
  createDraftStore,
  reopenStore,
  draftOne,
  draftOrdersFromDryRun,
  listDrafts,
} = require("../lib/commerce/dryOrderDraft.js");

function ean13(prefix12) {
  for (let digit = 0; digit < 10; digit += 1) {
    const candidate = `${prefix12}${digit}`;
    const result = validateEan(candidate);
    if (result.ok && !result.warning) return candidate;
  }
  throw new Error(`no checksum for ${prefix12}`);
}

const FRESH = new Date().toISOString();

function priced(overrides = {}) {
  return {
    name: "Bremsbelag Set Vorderachse",
    description: "Synthetic dry-run brake pad set for catalog review.",
    ean_gtin: ean13("590123412345"),
    mpn: "P85073",
    brand: "ATE",
    supplier_category: "automotive/bremssystem",
    supplier_price: { amount: 40, currency: "EUR" },
    shipping_cost: 6,
    marketplace_fee: 4,
    payment_fee: 1.2,
    return_reserve: 1,
    other_cost: 0,
    comparable_market_price: 90,
    stock: 12,
    reserved_stock: 2,
    stock_updated_at: FRESH,
    country: "DE",
    images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
    ...overrides,
  };
}

function readyRun() {
  return runCommercialDryRun({
    supplierId: "api-supplier-dry",
    format: "api",
    records: [
      priced({ supplier_sku: "API-CORE-001" }),
      priced({ supplier_sku: "XML-CORE-001", ean_gtin: ean13("400638133393"), mpn: "XML85073" }),
      priced({ supplier_sku: "CSV-CORE-001", ean_gtin: ean13("871234567890"), mpn: "CSV85073" }),
      priced({ supplier_sku: "LOW-CORE-001", ean_gtin: ean13("333333333333"), comparable_market_price: 55 }),
      priced({ supplier_sku: "ZERO-CORE-001", ean_gtin: ean13("222222222222"), stock: 0 }),
    ],
  });
}

describe("dry-run adapter sample", () => {
  it("maps the built-in sample into READY_FOR_REVIEW without selecting a live adapter", () => {
    const { SAMPLE_PRODUCTS } = require("../lib/supplier/dryRunSupplierAdapter.js");
    expect(SAMPLE_PRODUCTS[0].supplier_category).toBe("automotive/bremssystem");
    const result = runCommercialDryRun({
      supplierId: "dry-sample",
      format: "api",
      records: SAMPLE_PRODUCTS,
    });
    expect(result.salesGate).toBe("LOCKED");
    expect(result.products[0].decision).toBe(DECISIONS.READY_FOR_REVIEW);
    expect(result.products[0].code).not.toBe("CATEGORY_UNMAPPED");
    const store = createDraftStore();
    const drafts = draftOrdersFromDryRun(result, { customerId: "SYN-CUST", qty: 1, store });
    expect(drafts.summary.drafted).toBe(1);
    expect(drafts.paymentCaptured).toBe(false);
    store.db.close();
  });
});

describe("dry order draft from catalog review", () => {
  it("drafts READY_FOR_REVIEW rows without payment or sales", () => {
    const result = readyRun();
    const store = createDraftStore();
    const out = draftOrdersFromDryRun(result, { customerId: "SYN-CUST", qty: 1, store });
    expect(result.salesGate).toBe("LOCKED");
    expect(out.salesGate).toBe("LOCKED");
    expect(out.paymentCaptured).toBe(false);
    expect(out.supplierPurchase).toBe(false);
    expect(out.pimWrite).toBe(false);
    expect(out.live).toBe(false);
    expect(out.summary.drafted).toBe(3);
    expect(out.drafts.filter((row) => row.ok).every((row) => row.status === "DRAFT")).toBe(true);
    expect(out.drafts.filter((row) => row.ok).every((row) => row.orderType === "READINESS_TEST")).toBe(true);
    expect(out.drafts.filter((row) => row.ok).every((row) => row.payment.captured === false)).toBe(true);
    expect(out.drafts.filter((row) => row.ok).map((row) => row.catalog.sku).sort()).toEqual([
      "API-CORE-001",
      "CSV-CORE-001",
      "XML-CORE-001",
    ]);
    const blocked = out.drafts.filter((row) => row.ok === false);
    expect(blocked.some((row) => row.code === "NOT_READY_FOR_REVIEW")).toBe(true);
    store.db.close();
  });

  it("refuses a product that is not READY_FOR_REVIEW", () => {
    const result = readyRun();
    const low = result.products.find((item) => item.decision === DECISIONS.PRICE_NOT_VIABLE);
    const draft = draftOne({ product: low, customerId: "SYN-CUST" });
    expect(draft.ok).toBe(false);
    expect(draft.code).toBe("NOT_READY_FOR_REVIEW");
    expect(draft.paymentCaptured).toBe(false);
  });

  it("survives store reopen and blocks a duplicate draft", () => {
    const result = readyRun();
    const store = createDraftStore();
    const first = draftOrdersFromDryRun(result, { customerId: "SYN-CUST", qty: 1, store });
    expect(first.summary.drafted).toBe(3);
    const again = draftOne({
      product: result.products.find((item) => item.catalog?.sku === "API-CORE-001"),
      customerId: "SYN-CUST",
      store,
    });
    expect(again.code).toBe("DUPLICATE_DRAFT");
    store.db.close();
    const reopened = reopenStore({ dbPath: store.dbPath });
    const listed = listDrafts(reopened);
    expect(listed).toHaveLength(3);
    expect(listed.every((row) => row.status === "DRAFT")).toBe(true);
    expect(listed.every((row) => row.payload.payment.captured === false)).toBe(true);
    reopened.db.close();
  });

  it("does not touch the protected commerce sqlite", () => {
    const before = statSync("/workspace/server/data/buzzard.db");
    const result = readyRun();
    const store = createDraftStore();
    draftOrdersFromDryRun(result, { customerId: "SYN-CUST", store });
    store.db.close();
    const after = statSync("/workspace/server/data/buzzard.db");
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });
});
