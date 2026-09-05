import { describe, it, expect } from "vitest";
import { mapCommerceItemToCartLine, toCommerceAddress, pickPrimaryVariantId } from "@/lib/commerce/map";
import { shouldUseCommerceCore, generateIdempotencyKey } from "@/lib/commerce/runtime";
import { isCheckoutEnabled, isCommerceDryRun, showPrices } from "@/lib/shop/mode";

describe("commerce map", () => {
  it("maps commerce item to cart line", () => {
    const line = mapCommerceItemToCartLine({
      id: "ci_abc",
      productId: "pim_prod_demo001",
      variantId: "var_1",
      quantity: 2,
      priceSnapshot: 29.99,
      currency: "EUR",
      sku: "BZ-CORE-DEMO-001",
      title: "Demo",
    });
    expect(line.lineId).toBe("ci_abc");
    expect(line.unitPrice).toBe(29.99);
    expect(line.variantIds).toEqual(["var_1"]);
  });

  it("maps checkout address to commerce address", () => {
    const addr = toCommerceAddress(
      { firstName: "A", lastName: "B", street: "Str 1", zip: "10115", city: "Berlin", country: "DE" },
      { email: "a@test.de", firstName: "A", lastName: "B", phone: "", guest: true }
    );
    expect(addr.postalCode).toBe("10115");
    expect(addr.line1).toBe("Str 1");
  });

  it("picks primary variant", () => {
    expect(pickPrimaryVariantId(["v1", "v2"])).toBe("v1");
    expect(pickPrimaryVariantId([])).toBeUndefined();
  });
});

describe("shop mode Part 9", () => {
  it("keeps storefront browse-only while commerce dry-run is available", () => {
    const prevCommerce = process.env.NEXT_PUBLIC_COMMERCE_CORE;
    const prevSales = process.env.NEXT_PUBLIC_SALES_ENABLED;
    process.env.NEXT_PUBLIC_COMMERCE_CORE = "1";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    expect(isCheckoutEnabled()).toBe(false);
    expect(showPrices()).toBe(false);
    expect(isCommerceDryRun()).toBe(true);
    process.env.NEXT_PUBLIC_COMMERCE_CORE = prevCommerce;
    process.env.NEXT_PUBLIC_SALES_ENABLED = prevSales;
  });
});

describe("commerce runtime", () => {
  it("generates idempotency keys", () => {
    const a = generateIdempotencyKey("test");
    const b = generateIdempotencyKey("test");
    expect(a).not.toBe(b);
    expect(a.startsWith("test_")).toBe(true);
  });

  it("respects commerce core flag off", () => {
    const prev = process.env.NEXT_PUBLIC_COMMERCE_CORE;
    process.env.NEXT_PUBLIC_COMMERCE_CORE = "0";
    expect(shouldUseCommerceCore()).toBe(false);
    process.env.NEXT_PUBLIC_COMMERCE_CORE = prev;
  });
});
