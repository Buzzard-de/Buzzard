import { getAccountToken } from "@/lib/account/client";
import { createCartLineId, type CartLineItem } from "@/lib/cart/types";
import {
  dispatchCartUpdated,
  readLocalCart,
  writeLocalCart,
} from "@/lib/cart/storage";
import { resolveLinePricing } from "@/lib/checkout/totals";
import { getProductBySku } from "@/lib/products/service";
import { isSqliteStoreEnabled } from "@/lib/store/config";
import { storeFetchCart, storeSyncCart } from "@/lib/store/client";
import type { StoreCartItem } from "@/lib/store/types";

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function shouldSyncCartWithApi(): boolean {
  return isSqliteStoreEnabled() && Boolean(getAccountToken());
}

function storeItemToCartLine(item: StoreCartItem): CartLineItem | null {
  const match = getProductBySku(item.sku);
  if (!match) return null;

  const priced = resolveLinePricing(match.product.id, match.variantIds, item.quantity);
  if (!priced) return null;

  return {
    lineId: createCartLineId(match.product.id, match.variantIds),
    productId: match.product.id,
    name: priced.name,
    sku: priced.sku,
    unitPrice: priced.unitPrice,
    qty: item.quantity,
    variantIds: match.variantIds,
    variantLabel: priced.variantLabel,
    imageKey: priced.imageKey,
    vatRate: priced.vatRate,
  };
}

export function mergeCartLines(local: CartLineItem[], serverItems: StoreCartItem[]): CartLineItem[] {
  const merged = new Map<string, CartLineItem>();

  for (const item of local) {
    merged.set(item.lineId, { ...item });
  }

  for (const serverItem of serverItems) {
    const line = storeItemToCartLine(serverItem);
    if (!line) continue;

    const existing = merged.get(line.lineId);
    if (existing) {
      merged.set(line.lineId, {
        ...existing,
        qty: Math.max(existing.qty, line.qty),
        unitPrice: line.unitPrice,
      });
    } else {
      merged.set(line.lineId, line);
    }
  }

  return Array.from(merged.values());
}

export function applyMergedCart(items: CartLineItem[]): CartLineItem[] {
  writeLocalCart(items);
  dispatchCartUpdated();
  return items;
}

export async function syncAccountCart(localItems?: CartLineItem[]): Promise<CartLineItem[]> {
  if (!shouldSyncCartWithApi()) {
    return localItems ?? readLocalCart();
  }

  const local = localItems ?? readLocalCart();

  try {
    const serverCart = await storeFetchCart();
    const merged = mergeCartLines(local, serverCart.items);
    await storeSyncCart(
      merged.map((item) => ({
        sku: item.sku,
        quantity: item.qty,
      }))
    );
    return applyMergedCart(merged);
  } catch {
    return local;
  }
}

export async function ensureServerCartSynced(items: CartLineItem[] = readLocalCart()): Promise<boolean> {
  if (!shouldSyncCartWithApi()) return true;
  if (items.length === 0) return true;

  try {
    await storeSyncCart(
      items.map((item) => ({
        sku: item.sku,
        quantity: item.qty,
      }))
    );
    return true;
  } catch {
    return false;
  }
}

export function scheduleServerCartSync(items: CartLineItem[]): void {
  if (!shouldSyncCartWithApi()) return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    ensureServerCartSynced(items).catch(() => {});
  }, 400);
}

export async function clearServerCart(): Promise<void> {
  if (!shouldSyncCartWithApi()) return;
  await storeSyncCart([]);
}
