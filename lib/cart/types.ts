export function createCartLineId(productId: string, variantIds: string[]): string {
  const key = [...variantIds].sort().join(",");
  return key ? `${productId}::${key}` : productId;
}

export interface CartLineItem {
  lineId: string;
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  qty: number;
  variantIds: string[];
  variantLabel: string;
  imageKey?: string;
  vatRate: number;
}

/** @deprecated Use CartLineItem */
export interface LegacyCartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export function lineSubtotal(item: CartLineItem): number {
  return Math.round(item.unitPrice * item.qty * 100) / 100;
}

export function cartSubtotal(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + lineSubtotal(item), 0);
}

export function cartCount(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function migrateLegacyCart(raw: unknown[]): CartLineItem[] {
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      if (typeof item.lineId === "string" && typeof item.productId === "string") {
        return item as unknown as CartLineItem;
      }
      if (typeof item.id === "string" && typeof item.name === "string" && typeof item.price === "number") {
        return {
          lineId: String(item.id),
          productId: String(item.id),
          name: String(item.name),
          sku: "",
          unitPrice: Number(item.price),
          qty: Math.max(1, Number(item.qty) || 1),
          variantIds: [],
          variantLabel: "",
          vatRate: 19,
        } satisfies CartLineItem;
      }
      return null;
    })
    .filter((item): item is CartLineItem => item !== null);
}
