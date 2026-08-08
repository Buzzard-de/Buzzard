import type { CategoryCard, MainNavLink, PopularProduct } from "@/types";
import {
  categoryTree,
  defaultMainCategoryId,
  findMainCategory,
  getSubCategories,
  getSubSubCategories,
  getDefaultSubCategoryId,
  findCategoryBySlug,
  categoryHref,
  formatCategoryLabel,
} from "@/lib/category-tree";

export {
  categoryTree,
  defaultMainCategoryId,
  findMainCategory,
  getSubCategories,
  getSubSubCategories,
  getDefaultSubCategoryId,
  findCategoryBySlug,
  categoryHref,
  formatCategoryLabel,
};

/** Linke Spalte: alle Hauptkategorien (01–13, erweiterbar auf 40) */
export const mainCategories = categoryTree.map((cat) => ({
  id: cat.id,
  slug: cat.slug,
  label: cat.label,
  icon: cat.icon ?? "car",
}));

/** Abwärtskompatibilität */
export const sidebarCategories = mainCategories;
export const defaultMegaMenuId = defaultMainCategoryId;

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

export const homeCategories: CategoryCard[] = [
  { id: "reifen", label: "REIFEN & FELGEN", href: categoryHref({ slug: "automotive/zubehoer-tuning/reifen-felgen" }) },
  { id: "oele", label: "MOTORENÖLE", href: categoryHref({ slug: "automotive/wartung-service/motoroele", productFilter: "motorenöle" }), filter: "motorenöle" },
  { id: "bremsen", label: "BREMSEN", href: categoryHref({ slug: "automotive/ersatzteile/bremsanlage", productFilter: "bremsen" }), filter: "bremsen" },
  { id: "batterien", label: "BATTERIEN", href: "/products/?filter=batterien", filter: "batterien" },
  { id: "filter", label: "FILTER", href: categoryHref({ slug: "automotive/wartung-service/filter-oele", productFilter: "filter" }), filter: "filter" },
  { id: "zuendung", label: "ZÜNDUNG", href: categoryHref({ slug: "automotive/ersatzteile/elektrik", productFilter: "zündung" }), filter: "zündung" },
  { id: "wischer", label: "SCHEIBENWISCHER", href: "/products/?filter=fahrwerk", filter: "fahrwerk" },
  { id: "pflege", label: "PFLEGEPRODUKTE", href: categoryHref({ slug: "automotive/pflege-reinigung/autopflege" }) },
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
