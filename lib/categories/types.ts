export type BuzzardLocale = "de" | "tr" | "ar";

export interface BuzzardCategory {
  id: string;
  menu_order: number;
  name: string;
  slug: string;
  url: string;
  level: number;
  children: BuzzardCategory[];
}

export interface BuzzardCategoryDocument {
  project: string;
  document: string;
  version: string;
  language: string;
  main_category_count: number;
  categories: BuzzardCategory[];
}
