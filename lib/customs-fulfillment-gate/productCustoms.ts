import { getRawProductById } from "@/lib/products/service";
import type { ProductCustoms } from "@/lib/products/types";

export interface ProductCustomsSnapshot {
  productId: string;
  hsCode?: string;
  originCountry?: string;
  customsValue?: number;
  commodityDescription?: string;
  restrictedGoods: boolean;
  documentationRequired: boolean;
  reviewRequired: boolean;
  source?: string;
}

export function loadProductCustomsSnapshot(
  productId: string,
  lineGross?: number,
  productName?: string,
): ProductCustomsSnapshot {
  const raw = getRawProductById(productId);
  const customs: ProductCustoms | undefined = raw?.customs;

  return {
    productId,
    hsCode: customs?.gtip || customs?.taric?.slice(0, 4),
    originCountry: customs?.origin_country,
    customsValue: lineGross,
    commodityDescription: raw?.name ?? productName,
    restrictedGoods: customs?.import_restricted === true,
    documentationRequired: Boolean(customs?.review_required),
    reviewRequired: customs?.review_required === true,
    source: customs?.source,
  };
}
