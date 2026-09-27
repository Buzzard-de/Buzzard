import type { BuzzardLocale } from "@/lib/i18n/types";
import treeDoc from "@/data/automotive/automotive_category_tree.json";

export interface LocalizedText {
  de: string;
  en: string;
  tr: string;
  ar: string;
}

export interface AutomotiveCategoryNode {
  id: string;
  parentId: string | null;
  slug: string;
  level: number;
  name: LocalizedText;
  description: LocalizedText;
  image: string | null;
  bannerImage: string | null;
  icon: string | null;
  active: boolean;
  sortOrder: number;
  seo: {
    title: LocalizedText;
    description: LocalizedText;
  };
  attributes: string[];
  vehicleTypes: string[];
  compatibilityRequired: boolean;
  children?: AutomotiveCategoryNode[];
}

export interface AutomotiveFilterDef {
  key: string;
  type: "select" | "range";
  labelKey: string;
}

const tree = treeDoc as {
  root: AutomotiveCategoryNode;
  safety: Record<string, unknown>;
  stats: { subcategories: number; subSubcategories: number };
};

const byId = new Map<string, AutomotiveCategoryNode>();
const bySlugPath = new Map<string, AutomotiveCategoryNode>();
const childrenByParent = new Map<string, AutomotiveCategoryNode[]>();

function walk(node: AutomotiveCategoryNode, slugPath: string[] = []) {
  byId.set(node.id, node);
  const pathKey = slugPath.join("/");
  if (pathKey) bySlugPath.set(pathKey, node);
  if (node.parentId) {
    const list = childrenByParent.get(node.parentId) || [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }
  for (const child of node.children || []) {
    const nextPath = node.id === "automotive" ? [child.slug] : [...slugPath, child.slug];
    walk(child, nextPath);
  }
}

walk(tree.root, []);

for (const [, list] of childrenByParent) {
  list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getAutomotiveRoot(): AutomotiveCategoryNode {
  return tree.root;
}

export function getAutomotiveSafety() {
  return tree.safety;
}

export function getAutomotiveStats() {
  return tree.stats;
}

export function getAutomotiveCategoryById(id: string): AutomotiveCategoryNode | undefined {
  return byId.get(id);
}

export function getAutomotiveCategoryBySlugPath(slugPath: string): AutomotiveCategoryNode | undefined {
  const normalized = slugPath.replace(/^\/+|\/+$/g, "");
  return bySlugPath.get(normalized);
}

export function getAutomotiveSubcategories(): AutomotiveCategoryNode[] {
  return [...(childrenByParent.get("automotive") || [])];
}

export function getAutomotiveChildren(parentId: string): AutomotiveCategoryNode[] {
  return [...(childrenByParent.get(parentId) || [])];
}

export function flattenAutomotiveCategories(): AutomotiveCategoryNode[] {
  return [...byId.values()].sort((a, b) => a.level - b.level || a.sortOrder - b.sortOrder);
}

export function getAutomotiveCategoryLabel(
  category: AutomotiveCategoryNode,
  locale: BuzzardLocale
): string {
  return category.name[locale] || category.name.en || category.name.de;
}

export function getAutomotiveCategoryUrl(category: AutomotiveCategoryNode): string {
  if (category.level === 1 || category.id === "automotive") return "/products/automotive/";
  const parts = ["automotive"];
  let current: AutomotiveCategoryNode | undefined = category;
  const chain: AutomotiveCategoryNode[] = [current];
  while (current?.parentId && current.parentId !== "automotive") {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  for (const node of chain) {
    if (node.id !== "automotive") parts.push(node.slug);
  }
  return `/products/${parts.join("/")}/`;
}

export function getAutomotiveBreadcrumb(categoryId: string): AutomotiveCategoryNode[] {
  const chain: AutomotiveCategoryNode[] = [];
  let current = byId.get(categoryId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

const FILTER_KEYS: Record<string, string[]> = {
  "auto-sub-01": ["tireWidth", "aspectRatio", "rimDiameter", "season", "loadIndex", "speedRating", "brand"],
  "auto-sub-03": ["viscosity", "capacity", "oilType", "acea", "api", "manufacturerApproval", "brand"],
  "auto-sub-04": ["discDiameter", "axlePosition", "brand"],
  "auto-sub-05": ["filterType", "brand"],
  "auto-sub-06": ["voltage", "capacityAh", "coldCrankingAmps", "batteryTechnology", "brand"],
};

export function getAutomotiveFiltersForCategory(categoryId: string): AutomotiveFilterDef[] {
  const subId = byId.get(categoryId)?.level === 2 ? categoryId : byId.get(categoryId)?.parentId || categoryId;
  const keys = FILTER_KEYS[subId] || ["brand"];
  return keys.map((key) => ({
    key,
    type: key === "tireWidth" || key === "discDiameter" ? "range" : "select",
    labelKey: `automotive.filters.${key}`,
  }));
}

export function getAutomotiveStaticParams(): Array<{ slug?: string[] }> {
  const params: Array<{ slug?: string[] }> = [{}];
  for (const [path] of bySlugPath) {
    params.push({ slug: path.split("/") });
  }
  return params;
}

export { tree as automotiveCategoryTree };
