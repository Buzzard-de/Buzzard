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
    title: "Bis zu -30% auf ausgewählte Teile",
    href: "/kategorie/automotive/",
    imageKey: "tire",
  },
  {
    id: "camp-2",
    tag: "TEXTIL",
    title: "Neue Saisonkollektion",
    href: "/kategorie/textil/",
    imageKey: "oel",
  },
  {
    id: "camp-3",
    tag: "ANGEBOTE",
    title: "Top-Seller der Woche",
    href: "/products/?sort=bestseller",
    imageKey: "batterie",
  },
];

export const homeReviews = [
  { id: "r1", name: "Michael K.", text: "Schnelle Lieferung und top Qualität. Sehr empfehlenswert!", rating: 5 },
  { id: "r2", name: "Sarah M.", text: "Große Auswahl, faire Preise und unkomplizierter Service.", rating: 5 },
  { id: "r3", name: "Thomas B.", text: "Buzzard ist mein go-to Shop für Automotive-Teile.", rating: 5 },
];
