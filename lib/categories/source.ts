import type { BuzzardCategoryDocument } from "./types";
import catalog from "@/data/buzzard_categories.json";

export const categoryCatalog = catalog as BuzzardCategoryDocument;

export const MAIN_CATEGORY_COUNT = categoryCatalog.main_category_count;
