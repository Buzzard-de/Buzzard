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
import { adminLogin, adminLogout, fetchAdminMe, getAdminToken } from "./client";
import type { AdminUser } from "./types";

interface AdminAuthContextValue {
  user: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string, totpCode?: string, challengeToken?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!getAdminToken()) {
        if (active) setReady(true);
        return;
      }
      try {
        const me = await fetchAdminMe();
        if (active) setUser(me);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, totpCode?: string, challengeToken?: string) => {
    const result = await adminLogin(email, password, totpCode, challengeToken);
    if (result.requires2FA) {
      throw new Error("admin.auth.requires2FA");
    }
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
