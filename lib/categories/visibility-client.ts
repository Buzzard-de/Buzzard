"use client";

import { useEffect, useState } from "react";

export type VisibilityMap = Record<string, { status?: string }>;

export function useCategoryVisibilityMap(): VisibilityMap {
  const [map, setMap] = useState<VisibilityMap>({});

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
    if (!base) return;
    fetch(`${base}/api/categories/visibility`, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.visibility) setMap(data.visibility);
      })
      .catch(() => {});
  }, []);

  return map;
}
