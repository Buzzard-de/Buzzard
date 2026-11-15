import master50 from "@/data/taxonomy/buzzard_master_50_main_categories.json";
import retiredDoc from "@/data/taxonomy/retired_shop_l1.json";

export type MasterCategory = {
  num: number;
  code: string;
  name: string;
  slug: string;
};

const RETIRED_SHOP = new Set((retiredDoc.retired as Array<{ shop_id: string }>).map((r) => r.shop_id));
const RETIRED_MASTER = new Set((master50.retired_codes as string[]) || ["bz.20", "bz.25", "bz.26"]);

export function getRetiredShopIds(): string[] {
  return [...RETIRED_SHOP];
}

export function isRetiredShopId(id: string): boolean {
  return RETIRED_SHOP.has(id) || id.startsWith("cat-25-") || id.startsWith("cat-43-") || id.startsWith("cat-46-");
}

export function isRetiredMasterCode(code: string): boolean {
  return RETIRED_MASTER.has(code);
}

export function getMasterCategories(): MasterCategory[] {
  return (master50.categories as MasterCategory[]).slice().sort((a, b) => a.num - b.num);
}

export function getMasterCategoryCount(): number {
  return getMasterCategories().length;
}
