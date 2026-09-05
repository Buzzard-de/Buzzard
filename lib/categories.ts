import type { CategoryCard, MainNavLink, PopularProduct } from "@/types";
import type { BuzzardCategory, BuzzardLocale } from "@/lib/categories/types";
import { categoryCatalog } from "@/lib/categories/source";
import {
  getMainCategories,
  getVisibleMainCategories,
  isCategoryVisibleToCustomer,
  filterVisibleTree,
  getCategoryById,
  getChildren,
  getDefaultMainCategoryId,
  getDefaultSubCategoryId,
  findCategoryBySlugPath,
  findCategoryByUrl,
  categoryHref,
  categoryProductsHref,
  getAllCategoryPaths,
  getAllCategoryStaticParams,
  splitSubcategoriesIntoColumns,
  getCategoryAncestors,
  getCategoryBreadcrumb,
  collectDescendantIds,
  isCategoryOrDescendant,
  isCategoryInScope,
  categoryTree,
} from "@/lib/categories/service";

export const MAIN_CATEGORY_COUNT = categoryCatalog.main_category_count;
import { getCategoryLabel, formatMenuLabel } from "@/lib/categories/i18n";
import { getMainCategoryIcon } from "@/lib/categories/icons";
import { getProductsForCategory } from "@/lib/products";

export const DEFAULT_LOCALE: BuzzardLocale = "de";

export {
  getMainCategories,
  getVisibleMainCategories,
  isCategoryVisibleToCustomer,
  filterVisibleTree,
  getCategoryById,
  getChildren,
  getDefaultMainCategoryId,
  getDefaultSubCategoryId,
  findCategoryBySlugPath,
  findCategoryByUrl,
  categoryHref,
  categoryProductsHref,
  getAllCategoryPaths,
  getAllCategoryStaticParams,
  splitSubcategoriesIntoColumns,
  getCategoryAncestors,
  getCategoryBreadcrumb,
  collectDescendantIds,
  isCategoryOrDescendant,
  isCategoryInScope,
  categoryTree,
  getCategoryLabel,
  formatMenuLabel,
  getMainCategoryIcon,
};

/** Linke Spalte: Hauptkategorien aus JSON (Smart-Menü: 48 Kategorien via API) */
export const mainCategories = getMainCategories().map((cat) => ({
  id: cat.id,
  slug: cat.slug,
  label: formatMenuLabel(cat, DEFAULT_LOCALE),
  icon: getMainCategoryIcon(cat.id),
  href: categoryHref(cat),
}));

export const sidebarCategories = mainCategories;
export const defaultMegaMenuId = getDefaultMainCategoryId();

export const mainNavLinks: MainNavLink[] = [
  { label: "STARTSEITE", href: "/" },
  { label: "ANGEBOTE", href: "/products/?sort=price-asc" },
  { label: "NEUHEITEN", href: "/products/?sort=bestseller" },
  { label: "MARKEN", href: "/products/?q=marken" },
  { label: "HILFE & KONTAKT", href: "/hilfe/" },
];

export const trustBadges = [
  { label: "TOP MARKEN", icon: "star" },
  { label: "SCHNELLE LIEFERUNG", icon: "truck" },
  { label: "KOSTENLOSER VERSAND", icon: "box" },
  { label: "SICHERE ZAHLUNG", icon: "shield" },
];

export function getPopularProducts(): PopularProduct[] {
  const automotive = getCategoryById("cat-05");
  if (!automotive) return [];
  return getProductsForCategory(automotive, 3).map((product) => ({
    id: product.id,
    productId: product.id,
    name: product.name,
    price: product.price,
    oldPrice: product.compareAtPrice ?? Math.round(product.price * 1.25 * 100) / 100,
    discount: product.compareAtPrice
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 20,
    rating: 0,
    imageKey: product.imageKey ?? "oel",
    href: product.url,
  }));
}

export const filterOptions = getChildren("cat-05").map((cat) => ({
  id: cat.id,
  label: getCategoryLabel(cat, DEFAULT_LOCALE),
  href: categoryHref(cat),
}));

function homeCard(category: BuzzardCategory): CategoryCard {
  return {
    id: category.id,
    label: getCategoryLabel(category, DEFAULT_LOCALE).toUpperCase(),
    href: categoryHref(category),
  };
}

export function getFeaturedSubcategories(mainId: string, limit = 6): CategoryCard[] {
  return getChildren(mainId).slice(0, limit).map(homeCard);
}

/** Cross-category highlights for homepage (one subcategory per main branch). */
export function getDiversePopularCategories(limit = 8): Array<CategoryCard & { icon: string }> {
  const featuredMainIds = [
    "cat-05",
    "cat-01",
    "cat-12",
    "cat-07",
    "cat-10",
    "cat-14",
    "cat-25",
    "cat-39",
    "cat-02",
    "cat-18",
  ];
  const cards: Array<CategoryCard & { icon: string }> = [];

  for (const mainId of featuredMainIds) {
    const child = getChildren(mainId)[0];
    if (!child) continue;
    cards.push({
      ...homeCard(child),
      icon: getMainCategoryIcon(mainId),
    });
    if (cards.length >= limit) break;
  }

  return cards;
}

/** @deprecated Use getFeaturedSubcategories(mainCategoryId) */
export const homeCategories: CategoryCard[] = getFeaturedSubcategories("cat-01", 6);

export const brands = [
  { name: "BOSCH", className: "brand-bosch" },
  { name: "MANN", sub: "FILTER", className: "brand-mann" },
  { name: "MAHLE", className: "brand-mahle" },
  { name: "brembo", className: "brand-brembo" },
  { name: "Castrol", className: "brand-castrol" },
  { name: "LIQUI", sub: "MOLY", className: "brand-liqui" },
  { name: "Continental", className: "brand-conti" },
  { name: "Michelin", className: "brand-michelin" },
  { name: "BILSTEIN", className: "brand-bilstein" },
  { name: "Valeo", className: "brand-valeo" },
];

/** @deprecated Use formatMenuLabel */
export function formatCategoryLabel(node: { id: string; menu_order?: number; name: string }) {
  const cat = getCategoryById(node.id);
  if (cat) return formatMenuLabel(cat, DEFAULT_LOCALE);
  return node.id;
}

/** @deprecated Use findCategoryBySlugPath */
export function findCategoryBySlug(slug: string) {
  return findCategoryBySlugPath(slug);
}

/** @deprecated Use getChildren */
export function getSubCategories(mainId: string) {
  return getChildren(mainId);
}

/** @deprecated Use getChildren */
export function getSubSubCategories(mainId: string, subId: string) {
  return getChildren(subId);
}

/** @deprecated Use getCategoryById */
export function findMainCategory(mainId: string) {
  return getCategoryById(mainId);
}
