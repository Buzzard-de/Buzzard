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
import { adminLogin, adminLogout, clearAdminToken, fetchAdminMe, getAdminToken } from "./client";
import { ADMIN_REFUSAL_EVENT, type AdminRefusal } from "./refusals";
import type { AdminLoginResult } from "./securityTypes";
import type { AdminUser } from "./types";

interface AdminAuthContextValue {
  user: AdminUser | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    totpCode?: string,
    challengeToken?: string
  ) => Promise<AdminLoginResult>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/** How often an open admin page asks the API whether its session still exists. */
const SESSION_RECHECK_MS = 5 * 60 * 1000;

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
        clearAdminToken();
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // A session ends on the server (8 h lifetime, revocation, logout elsewhere) while the page
  // stays open. Re-check on focus and on a timer so the page returns to the login form.
  useEffect(() => {
    if (!user) return;
    let active = true;
    let checking = false;
    async function recheck() {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        if (getAdminToken()) await fetchAdminMe();
        else if (active) setUser(null);
      } catch (err) {
        // Only a rejected session ends the login; an unreachable API does not.
        if (active && err instanceof Error && err.message === "admin.auth.required") {
          clearAdminToken();
          setUser(null);
        }
      } finally {
        checking = false;
      }
    }
    // An admin request that was answered with "not signed in": ask the API right away.
    function onRefusal(event: Event) {
      if ((event as CustomEvent<AdminRefusal>).detail?.status === 401) void recheck();
    }
    const timer = window.setInterval(recheck, SESSION_RECHECK_MS);
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener(ADMIN_REFUSAL_EVENT, onRefusal);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener(ADMIN_REFUSAL_EVENT, onRefusal);
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string, totpCode?: string, challengeToken?: string) => {
    const result = await adminLogin(email, password, totpCode, challengeToken);
    if (!result.requires2FA && result.user) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
