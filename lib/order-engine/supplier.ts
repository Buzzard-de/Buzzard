import { getProduct } from "@/lib/product-engine";
import { selectBestSupplierForOrder } from "@/lib/supplier-engine/selection";
import { getSupplierSelectionStockInfo } from "@/lib/inventory-engine";
import { getTranslationForLocale } from "@/lib/product-engine/translations";
import type { SupplierAssignmentSnapshot } from "./types";

export interface SupplierSelectionOutcome {
  ok: boolean;
  assignment?: SupplierAssignmentSnapshot;
  offer?: {
    supplierId: string;
    supplierOfferId: string;
    supplierSku: string;
    supplierPrice: number;
    currency: string;
    stock: number;
  };
  productName?: string;
  sku?: string;
  ean?: string;
  mpn?: string;
  categoryId?: string;
  reason?: string;
}

export function selectSupplierForOrderItem(
  productId: string,
  marketId: string,
  forceUnavailable = false
): SupplierSelectionOutcome {
  if (forceUnavailable) {
    return { ok: false, reason: "SUPPLIER_UNAVAILABLE" };
  }

  const product = getProduct(productId);
  if (!product) return { ok: false, reason: "PRODUCT_NOT_FOUND" };

  const selection = selectBestSupplierForOrder(product, { countryCode: marketId });
  if (!selection) {
    const allZeroStock = product.supplierOffers.every((o) => o.stock <= 0);
    return { ok: false, reason: allZeroStock ? "OUT_OF_STOCK" : "SUPPLIER_UNAVAILABLE" };
  }

  const offer = selection.offer;
  const stockInfo = getSupplierSelectionStockInfo(
    productId,
    offer.supplierId,
    offer.supplierSku
  );

  if (stockInfo && stockInfo.saleableQuantity <= 0) {
    return { ok: false, reason: "OUT_OF_STOCK" };
  }

  const de = getTranslationForLocale(product.translations, "de");
  const assignment: SupplierAssignmentSnapshot = {
    supplierId: offer.supplierId,
    supplierOfferId: offer.supplierSku,
    supplierSku: offer.supplierSku,
    supplierCost: offer.supplierPrice,
    supplierCurrency: offer.currency,
    selectionScore: selection.score,
    selectionReasons: selection.reasons,
    shippingRoute: offer.shippingRegions?.[0],
    expectedDeliveryDays: offer.leadTimeDays,
    selectedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    assignment,
    offer: {
      supplierId: offer.supplierId,
      supplierOfferId: offer.supplierSku,
      supplierSku: offer.supplierSku,
      supplierPrice: offer.supplierPrice,
      currency: offer.currency,
      stock: offer.stock,
    },
    productName: de?.name ?? product.productId,
    sku: product.sku,
    ean: product.ean ?? product.gtin,
    mpn: product.mpn,
    categoryId: product.categoryId,
  };
}
