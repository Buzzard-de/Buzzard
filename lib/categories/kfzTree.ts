import bridge from "@/data/taxonomy/kfz_shop_bridge.json";
import kfzTree from "@/data/taxonomy/buzzard_master_kfz_category_tree_v1.json";
import kfzIntelligenceOs from "@/data/taxonomy/buzzard_master_kfz_intelligence_os.json";

export interface KfzL3Node {
  kfz_id: string;
  kfz_name: string;
  slug: string;
}

export interface KfzSubcategory {
  kfz_id: string;
  kfz_name: string;
  slug: string;
  children?: KfzL3Node[];
}

export interface KfzCompetitor {
  id: string;
  name: string;
  type: string;
  strength: number;
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
  l3_count?: number;
  competitor_coverage?: Record<string, number>;
  active_competitors?: string[];
  subcategories: KfzSubcategory[];
}

export interface KfzShopBridge {
  version: string;
  shop_automotive_root_id: string;
  main_category_count: number;
  subcategory_count: number;
  l3_count?: number;
  url_prefix: string;
  competitors?: KfzCompetitor[];
  mains: KfzMainCategory[];
}

export interface KfzIntelligenceOs {
  name: string;
  version: string;
  taxonomy: Array<{
    id: string;
    name: string;
    subcategories: Array<{
      id: string;
      name: string;
      children: Array<{ id: string; name: string }>;
    }>;
  }>;
  competitors: KfzCompetitor[];
  coverage: Record<string, Record<string, number>>;
  note?: string;
}

export const kfzShopBridge = bridge as KfzShopBridge;
export const kfzCategoryTree = kfzTree;
export const kfzIntelligence = kfzIntelligenceOs as KfzIntelligenceOs;

export const KFZ_URL_PREFIX = kfzShopBridge.url_prefix;

export function getKfzMains(): KfzMainCategory[] {
  return kfzShopBridge.mains;
}

export function getKfzCompetitors(): KfzCompetitor[] {
  return kfzShopBridge.competitors ?? kfzIntelligence.competitors ?? [];
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

export function getKfzL3Href(main: KfzMainCategory, child: KfzL3Node): string {
  const shopHref = getShopL2Href(main);
  const query = encodeURIComponent(child.kfz_name);
  if (shopHref) return `${shopHref}?q=${query}`;
  return `/products/?q=${query}`;
}

export function getCompetitorLabel(id: string): string {
  return getKfzCompetitors().find((item) => item.id === id)?.name ?? id;
}
