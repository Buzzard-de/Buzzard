"use client";

import { useCallback } from "react";
import { useAdminAuth } from "./context";
import { canAccess } from "./navPermissions.mjs";

/**
 * Whether the signed-in administrator's role includes a permission.
 *
 * The API decides on every request; this only keeps the pages from offering
 * an action, or sending a request, that the API would refuse.
 */
export function useCan(): (permission: string) => boolean {
  const { user } = useAdminAuth();
  const role = user?.role || "";
  return useCallback((permission: string) => Boolean(role) && canAccess(role, permission), [role]);
}
