"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  accountLogin,
  accountLogout,
  accountRegister,
  fetchAccountMe,
  getAccountToken,
  syncAccountWishlist,
} from "./client";
import type { AccountUser } from "./types";
import { getWishlistIds, saveWishlistIds } from "@/lib/wishlist";
import { readLocalCart } from "@/lib/cart/storage";
import { syncAccountCart } from "@/lib/store/cartSync";

interface AccountContextValue {
  user: AccountUser | null;
  ready: boolean;
  addressCount: number;
  wishlistCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (body: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [addressCount, setAddressCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!getAccountToken()) {
      setUser(null);
      setAddressCount(0);
      setWishlistCount(0);
      return;
    }
    const me = await fetchAccountMe();
    setUser(me.user);
    setAddressCount(me.addressCount);
    setWishlistCount(me.wishlistCount);
    const localIds = getWishlistIds();
    if (localIds.length) {
      const merged = await syncAccountWishlist(localIds);
      saveWishlistIds(merged);
      setWishlistCount(merged.length);
    }
    const localCart = readLocalCart();
    if (localCart.length || getAccountToken()) {
      await syncAccountCart(localCart);
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await accountLogin(email, password);
    setUser(result.user);
    await refresh();
  }, [refresh]);

  const register = useCallback(async (body: Record<string, unknown>) => {
    const result = await accountRegister(body);
    setUser(result.user);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await accountLogout();
    setUser(null);
    setAddressCount(0);
    setWishlistCount(0);
  }, []);

  const value = useMemo(
    () => ({ user, ready, addressCount, wishlistCount, login, register, logout, refresh }),
    [user, ready, addressCount, wishlistCount, login, register, logout, refresh]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
