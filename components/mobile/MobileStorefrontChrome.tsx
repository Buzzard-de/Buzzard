"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MobileBottomNav from "./MobileBottomNav";
import MobileHeader from "./MobileHeader";
import MobileSearch from "./MobileSearch";

export default function MobileStorefrontChrome() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    document.body.classList.toggle("buzzard-phone-storefront", !isAdmin);
    return () => {
      document.body.classList.remove("buzzard-phone-storefront");
    };
  }, [isAdmin]);

  if (isAdmin) return null;

  return (
    <>
      <div className="buzzard-mobile-only">
        <MobileHeader />
        <MobileSearch />
      </div>
      <MobileBottomNav />
    </>
  );
}
