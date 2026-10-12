import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("product write boundary — policy only, SoT inactive", () => {
  const boundary = require("../lib/pim/productWriteBoundary");
  const productCatalogPim = require("../lib/productCatalogPim");
  const productCore = require("../lib/pim/productCore");
  const pimCatalog = require("../lib/pimCatalog");
  const { db } = require("../lib/db");
  const productStore = require("../lib/productStore");

  function countSku(table, sku) {
    return db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE sku = ?`).get(sku).n;
  }

  it("does not activate Product Source of Truth", () => {
    expect(boundary.isProductSourceOfTruthActive()).toBe(false);
    const denied = boundary.authorizeCreate(
      { sku: "SOT-ACTIVATE", activateSourceOfTruth: true },
      { authorized: true, requireExplicitAuth: true, destination: "pim30_products" }
    );
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe("SOT_ACTIVATION_BLOCKED");
    expect(denied.productSourceOfTruthActive).toBe(false);
  });

  it("rejects unauthorized catalog-pim writes without persistence", () => {
    const result = productCatalogPim.createProduct({
      sku: `PIM30-UNAUTH-${Date.now()}`,
      status: "draft",
    });
    expect(result.error).toBeTruthy();
    expect(result.status).toBe(403);
    expect(result.reason).toBe("UNAUTHORIZED");
  });

  it("rejects ACTIVE catalog-pim create even when authorized", () => {
    const result = productCatalogPim.createProduct(
      { sku: `PIM30-ACT-${Date.now()}`, status: "ACTIVE" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.error).toMatch(/ACTIVE/);
    expect(result.reason).toBe("ACTIVE_CREATE_REJECTED");
  });

  it("rejects conflicting supplier offers and does not buy stock", () => {
    const result = productCatalogPim.createProduct(
      {
        sku: `PIM30-CONF-${Date.now()}`,
        status: "draft",
        offers: [
          { quantity: 8, source: "supplier_a" },
          { quantity: 2, source: "supplier_b" },
        ],
      },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.ok).not.toBe(true);
    expect(result.reason).toBe("CONFLICTING_SUPPLIER_OFFERS");
    expect(result.status).toBe(409);
  });

  it("allows an authorized draft through the boundary into the existing pim30 store only", () => {
    const sku = `PIM30-OK-${Date.now()}`;
    const result = productCatalogPim.createProduct(
      { sku, status: "draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.error).toBeUndefined();
    expect(result.created).toBe(true);
    expect(result.dualWrite).toBe(false);
    expect(result.productSourceOfTruthActive).toBe(false);
    expect(result.boundary).toBe(boundary.BOUNDARY_ID);
    expect(result.product.sku).toBe(sku);
    expect(result.product.status).toBe("draft");
    expect(productCore.getProduct(sku)).toBeNull();
  });

  it("keeps productCore ACTIVE create blocked on the shared boundary", () => {
    expect(() =>
      productCore.createProduct(
        { sku: `CORE-ACT-${Date.now()}`, title: "Nope", status: "ACTIVE" },
        { dryRun: true, source: "TEST", actorId: "vitest" }
      )
    ).toThrow(/ACTIVE/);
  });

  it("rejects unauthorized pimCatalog writes and preserves sku required", () => {
    const unauthorized = pimCatalog.createProduct({ sku: `PIM19-UNAUTH-${Date.now()}`, status: "draft" });
    expect(unauthorized.status).toBe(403);
    expect(unauthorized.reason).toBe("UNAUTHORIZED");
    expect(pimCatalog.createProduct({}).error).toBe("sku required");
    expect(
      pimCatalog.createProduct(
        { sku: `PIM19-ACT-${Date.now()}`, status: "active" },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      ).reason
    ).toBe("ACTIVE_CREATE_REJECTED");
    const systemSku = `PIM19-SYS-${Date.now()}`;
    const inherited = pimCatalog.createProduct(
      { sku: systemSku, status: "draft" },
      { source: "SYSTEM", actorId: "importer" }
    );
    expect(inherited.reason).toBe("UNAUTHORIZED");
    expect(countSku("pim_products", systemSku)).toBe(0);
  });

  it("rejects conflicting supplier offers on pimCatalog without buying stock", () => {
    const sku = `PIM19-CONF-${Date.now()}`;
    const result = pimCatalog.createProduct(
      {
        sku,
        status: "draft",
        offers: [
          { quantity: 8, source: "supplier_a" },
          { quantity: 2, source: "supplier_b" },
        ],
      },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.reason).toBe("CONFLICTING_SUPPLIER_OFFERS");
    expect(result.status).toBe(409);
    expect(countSku("pim_products", sku)).toBe(0);
  });

  it("does not trust body identity and cannot activate SoT via pimCatalog", () => {
    const sku = `PIM19-FORGE-${Date.now()}`;
    const forged = pimCatalog.createProduct({
      sku,
      status: "draft",
      authorized: true,
      actorId: "forged-admin",
      activateSourceOfTruth: true,
    });
    expect(forged.reason).toBe("SOT_ACTIVATION_BLOCKED");
    expect(countSku("pim_products", sku)).toBe(0);
  });

  it("allows an authorized pimCatalog draft only in pim_products", () => {
    const sku = `PIM19-OK-${Date.now()}`;
    const created = pimCatalog.createProduct(
      { sku, status: "draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(created.error).toBeUndefined();
    expect(created.product.sku).toBe(sku);
    expect(created.product.status).toBe("draft");
    expect(created.product.completeness).toEqual(expect.any(Number));
    expect(created.dualWrite).toBe(false);
    expect(created.productSourceOfTruthActive).toBe(false);
    expect(created.boundary).toBe(boundary.BOUNDARY_ID);
    expect(countSku("pim_products", sku)).toBe(1);
    expect(countSku("pim_core_products", sku)).toBe(0);
    expect(countSku("pim30_products", sku)).toBe(0);
    expect(countSku("products", sku)).toBe(0);
    expect(productStore.listProducts().some((row) => row.sku === sku)).toBe(false);

    const duplicate = pimCatalog.createProduct(
      { sku, status: "draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(duplicate.error).toBe("SKU already exists");
    expect(duplicate.status).toBe(409);
    expect(countSku("pim_products", sku)).toBe(1);
  });
});
