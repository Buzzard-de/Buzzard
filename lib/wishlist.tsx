"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSafeProductId } from "@/lib/security";
import { trackMarketingEvent } from "@/lib/marketing/events";

const STORAGE_KEY = "buzzard_wishlist";

export function getWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((id) => typeof id === "string" && isSafeProductId(id));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveWishlistIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export { saveWishlistIds };

interface WishlistContextValue {
  ids: string[];
  ready: boolean;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setIds(getWishlistIds());
    setReady(true);
  }, []);

  const toggle = useCallback((productId: string) => {
    const current = getWishlistIds();
    const removing = current.includes(productId);
    const next = removing
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    saveWishlistIds(next);
    setIds(next);
    if (!removing) trackMarketingEvent("add_to_wishlist", { product_id: productId });
  }, []);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  const value = useMemo(
    () => ({ ids, ready, toggle, has, count: ids.length }),
    [ids, ready, toggle, has]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
