"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PHONE_MEDIA_QUERY } from "@/lib/mobile/phoneViewport";
import MobileBottomNav from "./MobileBottomNav";
import MobileHeader from "./MobileHeader";
import MobileSearch from "./MobileSearch";

export default function MobileStorefrontChrome() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    const media = window.matchMedia(PHONE_MEDIA_QUERY);
    const sync = () => {
      const phone = media.matches && !isAdmin;
      document.body.classList.toggle("buzzard-phone-storefront", phone);
      document.body.classList.toggle("buzzard-admin-route", isAdmin);
      document.documentElement.classList.toggle("buzzard-phone-storefront", phone);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
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
