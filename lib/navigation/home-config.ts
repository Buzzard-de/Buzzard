import homepageSpec from "@/data/buzzard_homepage_navigation_spec.json";
import navSpec from "@/data/buzzard_home_navigation_spec.json";
import { getMainCategories } from "@/lib/categories/service";

export const homepageSections = homepageSpec.layout.homepage_sections;
export const supportedLocales = navSpec.languages as string[];
export const megaMenuConfig = homepageSpec.layout.mega_menu;
export const brandConfig = homepageSpec.brand;

/** Featured category IDs for homepage discovery (first 12 mains by menu_order). */
export function getHomeFeaturedCategoryIds(limit = 12): string[] {
  return getMainCategories()
    .slice(0, limit)
    .map((cat) => cat.id);
}

export const homeCampaigns = [
  {
    id: "camp-1",
    tag: "AUTOMOTIVE",
    title: "Automotive-Katalog entdecken",
    href: "/kategorie/automotive/",
    imageKey: "tire",
  },
  {
    id: "camp-2",
    tag: "TEXTIL",
    title: "Textil & Mode durchstöbern",
    href: "/kategorie/textil/",
    imageKey: "oel",
  },
  {
    id: "camp-3",
    tag: "KATALOG",
    title: "Gesamtkatalog ansehen",
    href: "/products/",
    imageKey: "batterie",
  },
];

/** Reserved for live reviews once sales are enabled. */
export const homeReviews: { id: string; name: string; text: string; rating: number }[] = [];
