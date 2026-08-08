"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackMarketingEvent } from "@/lib/marketing/events";

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackMarketingEvent("page_view", { page_path: pathname });
  }, [pathname]);

  return null;
}
