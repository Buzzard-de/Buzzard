import homepageSpec from "@/data/buzzard_homepage_navigation_spec.json";
import navSpec from "@/data/buzzard_home_navigation_spec.json";
import { getHomeCategoryIds } from "@/lib/home/homepageContent";

export const homepageSections = homepageSpec.layout.homepage_sections;
export const supportedLocales = navSpec.languages as string[];
export const megaMenuConfig = homepageSpec.layout.mega_menu;
export const brandConfig = homepageSpec.brand;

/** Homepage category IDs — full customer-facing L1 set (not a separate curated list). */
export function getHomeFeaturedCategoryIds(limit?: number): string[] {
  const ids = getHomeCategoryIds();
  return typeof limit === "number" ? ids.slice(0, limit) : ids;
}

/** Reserved for live reviews once sales are enabled. */
export const homeReviews: { id: string; name: string; text: string; rating: number }[] = [];
