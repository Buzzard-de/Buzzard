"use client";

import "@/styles/admin.css";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminShell from "@/components/admin/AdminShell";
import AdminPageAccess from "@/components/admin/AdminPageAccess";
import { AdminAuthProvider } from "@/lib/admin/context";
import { usePathname } from "next/navigation";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/admin/login");

  if (isLogin) return <>{children}</>;

  return (
    <AdminGuard>
      <AdminShell>
        <AdminPageAccess>{children}</AdminPageAccess>
      </AdminShell>
    </AdminGuard>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminAuthProvider>
  );
}
