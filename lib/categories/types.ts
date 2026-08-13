export type { BuzzardLocale } from "@/lib/i18n/types";

export interface BuzzardCategory {
  id: string;
  menu_order: number;
  name: string;
  slug: string;
  url: string;
  level: number;
  children: BuzzardCategory[];
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
