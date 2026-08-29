export type { BuzzardLocale } from "@/lib/i18n/types";

export type CategoryVisibilityStatus = "ACTIVE" | "HIDDEN" | "COMING_SOON" | "DRAFT";

export type CategoryReadinessStatus = "READY" | "NOT_READY" | "BLOCKED";

export interface CategoryReadiness {
  products?: CategoryReadinessStatus;
  pricing?: CategoryReadinessStatus;
  stock?: CategoryReadinessStatus;
  payment?: CategoryReadinessStatus;
  logistics?: CategoryReadinessStatus;
  frontend?: CategoryReadinessStatus;
  overall?: CategoryReadinessStatus;
}

export interface BuzzardCategory {
  id: string;
  menu_order: number;
  name: string;
  slug: string;
  url: string;
  level: number;
  children: BuzzardCategory[];
  /** Admin-managed visibility (optional overlay from API) */
  visibility?: CategoryVisibilityStatus;
  legacy_name?: string;
  legacy_slug?: string;
  legacy_slug_path?: string;
  legacy_url?: string;
}

export interface BuzzardCategoryDocument {
  project: string;
  document: string;
  version: string;
  language: string;
  main_category_count: number;
  categories: BuzzardCategory[];
}
