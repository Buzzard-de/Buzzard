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
    const phone = window.matchMedia("(max-width: 767px)").matches && !isAdmin;
    document.body.classList.toggle("buzzard-phone-storefront", phone);
    document.body.classList.toggle("buzzard-admin-route", isAdmin);
    document.documentElement.classList.toggle("buzzard-phone-storefront", phone);
    return () => {
      document.body.classList.remove("buzzard-phone-storefront", "buzzard-admin-route");
      document.documentElement.classList.remove("buzzard-phone-storefront");
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
