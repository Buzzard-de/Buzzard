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
import { products } from "@/lib/products";
import type { CartItem, Product } from "@/types";

const STORAGE_KEY = "buzzard_cart";

function normalizeCartItems(raw: Partial<CartItem>[]): CartItem[] {
  return raw
    .map((item) => {
      if (!item.name || typeof item.price !== "number") return null;

      const id =
        item.id ||
        products.find((p) => p.name === item.name)?.id;

      if (!id) return null;

      return {
        id,
        name: item.name,
        price: item.price,
        qty: Math.max(1, Number(item.qty) || 1),
      };
    })
    .filter((item): item is CartItem => item !== null);
}

export function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Partial<CartItem>[];
    const normalized = normalizeCartItems(raw);
    if (normalized.length !== raw.length) {
      saveCartItems(normalized);
    }
    return normalized;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveCartItems(items: CartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  ready: boolean;
  add: (product: Pick<Product, "id" | "name" | "price">, qty?: number) => void;
  remove: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  const persist = useCallback((next: CartItem[]) => {
    saveCartItems(next);
    setItems(next);
  }, []);

  useLayoutEffect(() => {
    setItems(getCartItems());
    setReady(true);

    const sync = () => setItems(getCartItems());
    window.addEventListener("storage", sync);
    window.addEventListener("buzzard-cart-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("buzzard-cart-updated", sync);
    };
  }, []);

  const add = useCallback(
    (product: Pick<Product, "id" | "name" | "price">, qty = 1) => {
      const current = getCartItems();
      const existing = current.find((i) => i.id === product.id);
      const next = existing
        ? current.map((i) =>
            i.id === product.id ? { ...i, qty: i.qty + qty } : i
          )
        : [...current, { id: product.id, name: product.name, price: product.price, qty }];
      persist(next);
      window.dispatchEvent(new Event("buzzard-cart-updated"));
    },
    [persist]
  );

  const remove = useCallback(
    (id: string) => {
      persist(getCartItems().filter((i) => i.id !== id));
      window.dispatchEvent(new Event("buzzard-cart-updated"));
    },
    [persist]
  );

  const updateQty = useCallback(
    (id: string, qty: number) => {
      if (qty < 1) {
        remove(id);
        return;
      }
      persist(getCartItems().map((i) => (i.id === id ? { ...i, qty } : i)));
      window.dispatchEvent(new Event("buzzard-cart-updated"));
    },
    [persist, remove]
  );

  const clear = useCallback(() => {
    persist([]);
    window.dispatchEvent(new Event("buzzard-cart-updated"));
  }, [persist]);

  const value = useMemo(
    () => ({
      items,
      count: getCartCount(items),
      total: getCartTotal(items),
      ready,
      add,
      remove,
      updateQty,
      clear,
    }),
    [items, ready, add, remove, updateQty, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
