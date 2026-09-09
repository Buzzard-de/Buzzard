import type { ProductEngineProduct } from "./types";
import { resolveStatusFromStock } from "./status";
import { emitProductEvent } from "./events";

export function updateProductStock(
  product: ProductEngineProduct,
  quantity: number,
  source: "supplier" | "manual" = "supplier"
): ProductEngineProduct {
  const previous = product.stock.quantity;
  const availability =
    quantity <= 0 ? "OUT_OF_STOCK" : quantity <= 5 ? "LOW_STOCK" : "IN_STOCK";

  const nextStatus = resolveStatusFromStock(product.status, quantity, {
    manuallyDiscontinued: product.status === "DISCONTINUED",
  });

  if (previous > 0 && quantity <= 0) {
    emitProductEvent("PRODUCT_OUT_OF_STOCK", product.productId, { previous, quantity, source });
  } else if (previous <= 0 && quantity > 0 && product.status !== "DISCONTINUED") {
    emitProductEvent("PRODUCT_BACK_IN_STOCK", product.productId, { previous, quantity, source });
  }

  return {
    ...product,
    stock: {
      quantity,
      availability,
      lastUpdated: new Date().toISOString(),
    },
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
}

export function aggregateSupplierStock(product: ProductEngineProduct): number {
  return product.supplierOffers.reduce((sum, o) => sum + Math.max(0, o.stock || 0), 0);
}
