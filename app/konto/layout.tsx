"use client";

import "@/styles/account.css";
import AccountGuard from "@/components/account/AccountGuard";
import AccountShell from "@/components/account/AccountShell";
import { usePathname } from "next/navigation";

const PUBLIC_PREFIXES = [
  "/konto/login",
  "/konto/registrieren",
  "/konto/passwort-vergessen",
  "/konto/passwort-zuruecksetzen",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <AccountGuard>
      <AccountShell>{children}</AccountShell>
    </AccountGuard>
  );
}
