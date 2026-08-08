import type { BuzzardCategory } from "./types";
import { categoryCatalog } from "./source";

const { categories } = categoryCatalog;

const byId = new Map<string, BuzzardCategory>();
const bySlugPath = new Map<string, BuzzardCategory>();
const parentById = new Map<string, string>();

function register(node: BuzzardCategory, slugPath: string[]) {
  byId.set(node.id, node);
  bySlugPath.set(slugPath.join("/"), node);
}

function indexTree(
  nodes: BuzzardCategory[],
  parentSlugs: string[] = [],
  parentId?: string
) {
  for (const node of nodes) {
    const slugPath = [...parentSlugs, node.slug];
    register(node, slugPath);
    if (parentId) parentById.set(node.id, parentId);
    if (node.children?.length) indexTree(node.children, slugPath, node.id);
  }
}

indexTree(categories);

export function getMainCategories(): BuzzardCategory[] {
  return [...categories].sort((a, b) => a.menu_order - b.menu_order);
}

export function getCategoryById(id: string): BuzzardCategory | undefined {
  return byId.get(id);
}

export function getChildren(parentId: string): BuzzardCategory[] {
  const parent = byId.get(parentId);
  if (!parent?.children?.length) return [];
  return [...parent.children].sort((a, b) => a.menu_order - b.menu_order);
}

export function getDefaultMainCategoryId(): string {
  return getMainCategories()[0]?.id ?? "cat-01";
}

export function getDefaultSubCategoryId(mainId: string): string {
  return getChildren(mainId)[0]?.id ?? "";
}

export function findCategoryBySlugPath(slugPath: string): BuzzardCategory | undefined {
  const normalized = slugPath.replace(/^\/+|\/+$/g, "");
  return bySlugPath.get(normalized);
}

export function findCategoryByUrl(url: string): BuzzardCategory | undefined {
  const match = url.match(/^\/kategori\/(.+)$/);
  if (!match) return undefined;
  return findCategoryBySlugPath(match[1]);
}

export function getSlugPath(category: BuzzardCategory): string {
  const match = category.url.match(/^\/kategori\/(.+)$/);
  return match ? match[1] : category.slug;
}

export function categoryHref(category: BuzzardCategory): string {
  return category.url.endsWith("/") ? category.url : `${category.url}/`;
}

/** Legacy query param support for product filtering pages. */
export function categoryProductsHref(category: BuzzardCategory): string {
  const slug = getSlugPath(category);
  return `/products/?kategorie=${encodeURIComponent(slug)}`;
}

export function getAllCategoryPaths(): string[] {
  return [...bySlugPath.keys()];
}

export function getAllCategoryStaticParams(): { slug: string[] }[] {
  return getAllCategoryPaths().map((path) => ({ slug: path.split("/") }));
}

export function splitSubcategoriesIntoColumns(
  items: BuzzardCategory[],
  columnCount = 3
): BuzzardCategory[][] {
  if (items.length === 0) return [];
  const cols: BuzzardCategory[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    cols[index % columnCount].push(item);
  });
  return cols.filter((col) => col.length > 0);
}

export function getParentCategory(id: string): BuzzardCategory | undefined {
  const parentId = parentById.get(id);
  return parentId ? byId.get(parentId) : undefined;
}

export function getCategoryAncestors(id: string): BuzzardCategory[] {
  const ancestors: BuzzardCategory[] = [];
  let current = parentById.get(id);
  while (current) {
    const node = byId.get(current);
    if (!node) break;
    ancestors.unshift(node);
    current = parentById.get(node.id);
  }
  return ancestors;
}

export function getCategoryBreadcrumb(id: string): BuzzardCategory[] {
  const node = byId.get(id);
  if (!node) return [];
  return [...getCategoryAncestors(id), node];
}

export function collectDescendantIds(id: string): string[] {
  const node = byId.get(id);
  if (!node) return [];
  const ids = [id];
  for (const child of node.children ?? []) {
    ids.push(...collectDescendantIds(child.id));
  }
  return ids;
}

export function isCategoryOrDescendant(categoryId: string, ancestorId: string): boolean {
  if (categoryId === ancestorId) return true;
  let current = parentById.get(categoryId);
  while (current) {
    if (current === ancestorId) return true;
    current = parentById.get(current);
  }
  return false;
}

export { categories as categoryTree };
