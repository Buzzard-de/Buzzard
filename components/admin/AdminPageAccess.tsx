"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/context";
import { ADMIN_NAV_GROUPS, adminHref } from "@/lib/admin/nav.config.mjs";
import { adminSlugOfPath, canAccessNavSlug, firstAccessibleSlug } from "@/lib/admin/navPermissions.mjs";

/**
 * Shows an admin page only to roles that may open it.
 *
 * The API refuses the data anyway; without this a page opened by its address
 * would render empty and send requests that are all refused. A role that may
 * not see the dashboard is taken to the first page it may open.
 */
export default function AdminPageAccess({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAdminAuth();
  const role = user?.role || "";
  const slug = adminSlugOfPath(pathname);
  const allowed = Boolean(role) && canAccessNavSlug(role, slug);
  const fallbackSlug = allowed ? null : firstAccessibleSlug(ADMIN_NAV_GROUPS, role);
  const redirectFromDashboard = !allowed && slug === "" && fallbackSlug !== null;

  useEffect(() => {
    if (redirectFromDashboard && fallbackSlug !== null) router.replace(adminHref(fallbackSlug));
  }, [redirectFromDashboard, fallbackSlug, router]);

  if (allowed) return <>{children}</>;
  if (redirectFromDashboard) return <div className="admin-loading">Lade Admin…</div>;

  return (
    <div className="admin-page" data-testid="admin-forbidden">
      <div className="admin-page-head">
        <h1>Kein Zugriff</h1>
      </div>
      <section className="admin-panel">
        <p className="admin-error" role="alert">
          Ihre Rolle ({role || "unbekannt"}) hat keinen Zugriff auf diesen Bereich.
        </p>
        {fallbackSlug !== null ? (
          <p>
            <Link href={adminHref(fallbackSlug)}>Zu einem Bereich mit Zugriff</Link>
          </p>
        ) : (
          <p className="admin-note">Für diese Rolle ist kein Bereich der Verwaltung freigegeben.</p>
        )}
      </section>
    </div>
  );
}
