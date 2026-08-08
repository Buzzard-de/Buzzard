"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackMarketingEvent } from "@/lib/marketing/events";

export default function ProductsSeoGuard() {
  const searchParams = useSearchParams();
  const hasFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("filter") && searchParams.get("filter") !== "alle") ||
    Boolean(searchParams.get("kategorie")) ||
    Boolean(searchParams.get("vin")) ||
    Number(searchParams.get("page") || "1") > 1;

  useEffect(() => {
    if (searchParams.get("q")) {
      trackMarketingEvent("search", { search_term: searchParams.get("q") || "" });
    }
    if (searchParams.get("kategorie")) {
      trackMarketingEvent("view_category", { category_slug: searchParams.get("kategorie") || "" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hasFilters) return;
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow");
  }, [hasFilters]);

  return null;
}
