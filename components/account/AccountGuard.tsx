"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/lib/account/context";

export default function AccountGuard({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/konto/login/");
  }, [ready, user, router]);

  if (!ready) return <div className="account-loading">…</div>;
  if (!user) return null;
  return <>{children}</>;
}
