"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/context";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/admin/login/");
  }, [ready, user, router]);

  if (!ready) return <div className="admin-loading">Lade Admin…</div>;
  if (!user) return null;
  return <>{children}</>;
}
