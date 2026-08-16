"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api/config";
import type { SmartMenuSignals } from "@/lib/smartMenu/bridge";
import { shopSubIdToBzSubId } from "@/lib/smartMenu/bridge";

export function useSmartMenuSignals(subId: string | undefined): SmartMenuSignals | null {
  const [signals, setSignals] = useState<SmartMenuSignals | null>(null);

  useEffect(() => {
    if (!subId) {
      setSignals(null);
      return;
    }

    const bzSubId = shopSubIdToBzSubId(subId);
    if (!bzSubId) {
      setSignals(null);
      return;
    }

    const resolvedBzSubId = bzSubId;
    let cancelled = false;
    const base = apiBaseUrl();

    async function load() {
      try {
        const res = await fetch(
          `${base}/api/smart-menu-48/signals/${encodeURIComponent(resolvedBzSubId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSignals(data.signals ?? null);
      } catch {
        if (!cancelled) setSignals(null);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [subId]);

  return signals;
}
