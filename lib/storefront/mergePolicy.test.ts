import { describe, expect, it } from "vitest";
import type { PublicProduct } from "@/lib/products/types";
import { mergeStorefrontProducts } from "@/lib/storefront/runtime";
import { mergeCatalogProducts } from "@/lib/catalogSeo/runtime";
import { mergeLocalizedProducts } from "@/lib/localizationFeeds/runtime";

function stub(slug: string, name: string): PublicProduct {
  return { seo: { slug, title: name, description: name }, name, sku: slug } as PublicProduct;
}

describe("catalog listing merge policy", () => {
  it("keeps JSON PDP identity when a live catalog reuses the same slug", () => {
    const json = stub("premium-bremsscheibe-testprodukt", "JSON PDP");
    const live = stub("premium-bremsscheibe-testprodukt", "PIM overlay");
    const extra = stub("isolated-cart-fixture", "PIM only");

    for (const merge of [mergeStorefrontProducts, mergeCatalogProducts, mergeLocalizedProducts]) {
      const merged = merge([json], [live, extra]);
      const overlap = merged.find((row) => row.seo.slug === "premium-bremsscheibe-testprodukt");
      const liveOnly = merged.find((row) => row.seo.slug === "isolated-cart-fixture");
      expect(overlap?.name).toBe("JSON PDP");
      expect(liveOnly?.name).toBe("PIM only");
    }
  });
});
