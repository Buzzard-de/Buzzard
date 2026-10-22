"use client";

import { useEffect, useState } from "react";
import { PHONE_MEDIA_QUERY } from "@/lib/mobile/phoneViewport";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useIsMobileNav(): boolean {
  return useMediaQuery(PHONE_MEDIA_QUERY);
}

export function useIsTabletNav(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}
