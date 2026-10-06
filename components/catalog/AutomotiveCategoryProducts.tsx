"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import ProductList from "@/components/ProductList";
import EmptyCatalogState from "@/components/catalog/EmptyCatalogState";
import { getAllProducts, filterProducts } from "@/lib/products";

interface AutomotiveCategoryProductsProps {
  categoryId: string;
  categorySlug: string;
}

/**
 * Lists products tagged with automotive taxonomy IDs when available.
 * Empty catalog is valid — no fake products injected.
 */
export default function AutomotiveCategoryProducts({
  categoryId,
  categorySlug,
}: AutomotiveCategoryProductsProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const products = useMemo(() => {
    const all = getAllProducts();
    const filtered = all.filter((p) => {
      const attrs = p.attributes as Record<string, string | undefined>;
      const autoCat = attrs.automotiveCategoryId || attrs.automotiveSubcategoryId;
      if (!autoCat) return false;
      return (
        autoCat === categoryId ||
        attrs.automotiveSubcategoryId === categoryId ||
        attrs.automotiveSubSubcategoryId === categoryId
      );
    });
    return filterProducts(filtered, "alle", query || null);
  }, [categoryId, query]);

  if (!products.length) {
    return <EmptyCatalogState />;
  }

  return <ProductList categorySlug={categorySlug} />;
}
