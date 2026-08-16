import bridge from "@/data/taxonomy/kfz_shop_bridge.json";
import kfzTree from "@/data/taxonomy/buzzard_master_kfz_category_tree_v1.json";

export interface KfzSubcategory {
  kfz_id: string;
  kfz_name: string;
  slug: string;
}

export interface KfzMainCategory {
  kfz_id: string;
  kfz_name: string;
  name_de: string;
  slug: string;
  shop_root_id: string;
  shop_l2_id: string;
  shop_l2_name: string | null;
  shop_l2_slug: string | null;
  subcategory_count: number;
  subcategories: KfzSubcategory[];
}

export interface KfzShopBridge {
  version: string;
  shop_automotive_root_id: string;
  main_category_count: number;
  subcategory_count: number;
  url_prefix: string;
  mains: KfzMainCategory[];
}

export const kfzShopBridge = bridge as KfzShopBridge;
export const kfzCategoryTree = kfzTree;

export const KFZ_URL_PREFIX = kfzShopBridge.url_prefix;

export function getKfzMains(): KfzMainCategory[] {
  return kfzShopBridge.mains;
}

export function getKfzMainById(mainId: string): KfzMainCategory | undefined {
  const normalized = mainId.padStart(2, "0");
  return kfzShopBridge.mains.find((main) => main.kfz_id === normalized);
}

export function getKfzMainBySlug(slug: string): KfzMainCategory | undefined {
  return kfzShopBridge.mains.find((main) => main.slug === slug);
}

export function kfzMainHref(main: KfzMainCategory): string {
  return `${KFZ_URL_PREFIX}/${main.slug}/`;
}

export function isKfzSlugPath(slugPath: string[]): boolean {
  return slugPath[0] === "automotive" && slugPath[1] === "kfz";
}

export function parseKfzSlugPath(slugPath: string[]): { main?: KfzMainCategory } {
  if (!isKfzSlugPath(slugPath)) return {};
  const mainSlug = slugPath[2];
  if (!mainSlug) return {};
  return { main: getKfzMainBySlug(mainSlug) };
}

export function getKfzStaticParams(): Array<{ slug: string[] }> {
  const params: Array<{ slug: string[] }> = [
    { slug: ["automotive", "kfz"] },
  ];
  for (const main of getKfzMains()) {
    params.push({ slug: ["automotive", "kfz", main.slug] });
  }
  return params;
}

export function getShopL2Href(main: KfzMainCategory): string | null {
  if (!main.shop_l2_slug) return null;
  return `/kategorie/automotive/${main.shop_l2_slug}/`;
}
