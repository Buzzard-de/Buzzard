import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("product write boundary — policy only, SoT inactive", () => {
  const boundary = require("../lib/pim/productWriteBoundary");
  const productCatalogPim = require("../lib/productCatalogPim");
  const productCore = require("../lib/pim/productCore");

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
});
