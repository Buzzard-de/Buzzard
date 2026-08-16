import { getCategoryById, getMainCategories } from "@/lib/categories";

/** Map storefront cat-XX main IDs to smart-menu bz.XX IDs by menu order position. */
const SHOP_TO_BZ_MAIN: Record<string, string> = {
  "cat-05": "bz.01",
  "cat-10": "bz.02",
  "cat-09": "bz.03",
  "cat-07": "bz.04",
  "cat-03": "bz.05",
  "cat-02": "bz.06",
  "cat-12": "bz.07",
  "cat-13": "bz.08",
  "cat-11": "bz.09",
  "cat-22": "bz.10",
  "cat-01": "bz.11",
  "cat-14": "bz.12",
  "cat-39": "bz.13",
  "cat-06": "bz.14",
  "cat-17": "bz.15",
  "cat-18": "bz.16",
  "cat-04": "bz.17",
  "cat-21": "bz.18",
  "cat-29": "bz.19",
  "cat-25": "bz.31",
  "cat-27": "bz.34",
  "cat-24": "bz.35",
  "cat-23": "bz.36",
  "cat-31": "bz.37",
  "cat-32": "bz.38",
  "cat-34": "bz.39",
  "cat-41": "bz.40",
  "cat-30": "bz.41",
  "cat-40": "bz.47",
  "cat-20": "bz.43",
};

export function shopMainIdToBzMainId(shopMainId: string): string | null {
  if (SHOP_TO_BZ_MAIN[shopMainId]) return SHOP_TO_BZ_MAIN[shopMainId];
  const main = getCategoryById(shopMainId);
  if (!main) return null;
  const order = main.menu_order;
  if (order >= 1 && order <= 48) {
    return `bz.${String(order).padStart(2, "0")}`;
  }
  return null;
}

export function shopSubIdToBzSubId(shopSubId: string): string | null {
  const sub = getCategoryById(shopSubId);
  if (!sub) return null;
  const parentId = sub.id.split("-").slice(0, 2).join("-");
  const bzMain = shopMainIdToBzMainId(parentId);
  if (!bzMain) return null;
  const siblings = getCategoryById(parentId)?.children ?? [];
  const index = siblings.findIndex((row) => row.id === shopSubId);
  if (index < 0) return null;
  const bzMainNum = bzMain.replace("bz.", "");
  const subNum = String(index + 1).padStart(2, "0");
  return `bz.${bzMainNum}.${subNum}`;
}

export interface SmartMenuSignals {
  popular?: Array<{ id: string; name: string; slug: string }>;
  brands?: Array<{ name: string }>;
  products?: Array<{ label: string; name: string }>;
}

export async function fetchSmartMenuSignals(subId: string): Promise<SmartMenuSignals | null> {
  const bzSubId = shopSubIdToBzSubId(subId);
  if (!bzSubId) return null;

  try {
    const base = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "";
    const res = await fetch(`${base}/api/smart-menu-48/signals/${encodeURIComponent(bzSubId)}`, {
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.signals ?? null;
  } catch {
    return null;
  }
}

export const SMART_MENU_MAIN_COUNT = 48;

export function getSmartMenuMainCount(): number {
  return SMART_MENU_MAIN_COUNT;
}

export function getStorefrontMainCount(): number {
  return getMainCategories().length;
}
