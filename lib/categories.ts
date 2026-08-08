import type { CategoryCard, MainNavLink, PopularProduct } from "@/types";
import type { BuzzardCategory, BuzzardLocale } from "@/lib/categories/types";
import { categoryCatalog } from "@/lib/categories/source";
import {
  getMainCategories,
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
  categoryTree,
} from "@/lib/categories/service";

export const MAIN_CATEGORY_COUNT = categoryCatalog.main_category_count;
import { getCategoryLabel, formatMenuLabel } from "@/lib/categories/i18n";
import { getMainCategoryIcon } from "@/lib/categories/icons";

export const DEFAULT_LOCALE: BuzzardLocale = "de";

export {
  getMainCategories,
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
  categoryTree,
  getCategoryLabel,
  formatMenuLabel,
  getMainCategoryIcon,
};

/** Linke Spalte: alle 41 Hauptkategorien aus JSON */
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
  { label: "ANGEBOTE", href: "/products/" },
  { label: "NEUHEITEN", href: "/products/" },
  { label: "MARKEN", href: "/products/" },
  { label: "HILFE & KONTAKT", href: "/impressum/" },
];

export const trustBadges = [
  { label: "TOP MARKEN", icon: "star" },
  { label: "SCHNELLE LIEFERUNG", icon: "truck" },
  { label: "KOSTENLOSER VERSAND", icon: "box" },
  { label: "SICHERE ZAHLUNG", icon: "shield" },
];

export const popularProducts: PopularProduct[] = [
  {
    id: "castrol-edge",
    productId: "motoroel-5w30",
    name: "Castrol Edge 5W-30 Motoröl 5L",
    price: 64.99,
    oldPrice: 89.99,
    discount: 25,
    rating: 5,
    imageKey: "oel",
  },
  {
    id: "bosch-wischer",
    productId: "scheibenwischer-set",
    name: "Bosch Aerotwin Scheibenwischer Set",
    price: 19.99,
    oldPrice: 24.99,
    discount: 20,
    rating: 5,
    imageKey: "wischer",
  },
  {
    id: "michelin-pilot",
    productId: "reifen-pilot-sport",
    name: "Michelin Pilot Sport 4 Reifen 225/45 R17",
    price: 89.99,
    oldPrice: 119.99,
    discount: 25,
    rating: 5,
    imageKey: "tire",
  },
];

export const filterOptions = [
  { id: "alle", label: "Alle" },
  { id: "bremsen", label: "Bremsen" },
  { id: "motorenöle", label: "Motorenöle" },
  { id: "filter", label: "Filter" },
  { id: "zündung", label: "Zündung" },
  { id: "batterien", label: "Batterien" },
  { id: "fahrwerk", label: "Fahrwerk" },
] as const;

function homeCard(category: BuzzardCategory): CategoryCard {
  return {
    id: category.id,
    label: getCategoryLabel(category, DEFAULT_LOCALE).toUpperCase(),
    href: categoryHref(category),
  };
}

const textileChildren = getChildren("cat-01");
const cosmetics = getCategoryById("cat-02");
const cleaning = getCategoryById("cat-03");
const automotive = getCategoryById("cat-05");

export const homeCategories: CategoryCard[] = [
  ...(textileChildren[0] ? [homeCard(textileChildren[0])] : []),
  ...(textileChildren[1] ? [homeCard(textileChildren[1])] : []),
  ...(cosmetics ? [homeCard(cosmetics)] : []),
  ...(cleaning ? [homeCard(cleaning)] : []),
  ...(automotive ? [homeCard(automotive)] : []),
];

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
