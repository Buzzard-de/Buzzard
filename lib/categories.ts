import type {
  CategoryCard,
  MainNavLink,
  MegaMenuContent,
  PopularProduct,
  SidebarCategory,
} from "@/types";

export const mainNavLinks: MainNavLink[] = [
  { label: "STARTSEITE", href: "/" },
  { label: "ANGEBOTE", href: "/products/" },
  { label: "NEUHEITEN", href: "/products/" },
  { label: "MARKEN", href: "/products/" },
  { label: "HILFE & KONTAKT", href: "/impressum/" },
];

export const sidebarCategories: SidebarCategory[] = [
  { id: "automotive", label: "AUTOMOTIVE", icon: "car" },
  { id: "sport", label: "SPORT & OUTDOOR", icon: "sport" },
  { id: "haus", label: "HAUS & WOHNEN", icon: "home" },
  { id: "garten", label: "GARTEN", icon: "garden" },
  { id: "werkzeug", label: "WERKZEUG & MASCHINEN", icon: "tools" },
  { id: "bau", label: "BAU & RENOVIERUNG", icon: "build" },
  { id: "elektronik", label: "ELEKTRONIK", icon: "electronics" },
  { id: "haushalt", label: "HAUSHALTSGERÄTE", icon: "appliance" },
  { id: "pflege", label: "PFLEGE & REINIGUNG", icon: "care" },
  { id: "tier", label: "TIERBEDARF", icon: "pet" },
  { id: "lebensmittel", label: "LEBENSMITTEL & GETRÄNKE", icon: "food" },
  { id: "baby", label: "BABY & KIND", icon: "baby" },
  { id: "mode", label: "MODE & ACCESSOIRES", icon: "fashion" },
];

export const megaMenuContent: Record<string, MegaMenuContent> = {
  automotive: {
    id: "automotive",
    title: "AUTOMOTIVE",
    groups: [
      {
        title: "WARTUNG & SERVICE",
        icon: "oil",
        links: [
          { label: "Motoröle", href: "/products/?filter=motorenöle" },
          { label: "Filter & Öle", href: "/products/?filter=filter" },
          { label: "Bremsflüssigkeit", href: "/products/?filter=bremsen" },
          { label: "Kühlflüssigkeit", href: "/products/?filter=motorenöle" },
        ],
      },
      {
        title: "ERSATZTEILE",
        icon: "parts",
        links: [
          { label: "Motor & Motorteile", href: "/products/" },
          { label: "Bremsanlage", href: "/products/?filter=bremsen" },
          { label: "Fahrwerk & Lenkung", href: "/products/?filter=fahrwerk" },
          { label: "Elektrik & Zündung", href: "/products/?filter=zündung" },
        ],
      },
      {
        title: "ZUBEHÖR & TUNING",
        icon: "tuning",
        links: [
          { label: "Innenraum", href: "/products/" },
          { label: "Beleuchtung", href: "/products/" },
          { label: "Transport", href: "/products/" },
          { label: "Reifen & Felgen", href: "/products/" },
        ],
      },
      {
        title: "PFLEGE & REINIGUNG",
        icon: "care",
        links: [
          { label: "Autopflege", href: "/products/" },
          { label: "Innenraumreiniger", href: "/products/" },
          { label: "Felgenreiniger", href: "/products/" },
          { label: "Scheibenreiniger", href: "/products/" },
        ],
      },
    ],
  },
  sport: {
    id: "sport",
    title: "SPORT & OUTDOOR",
    groups: [
      {
        title: "FITNESS",
        icon: "sport",
        links: [
          { label: "Trainingsgeräte", href: "/products/" },
          { label: "Yoga & Pilates", href: "/products/" },
        ],
      },
      {
        title: "OUTDOOR",
        icon: "garden",
        links: [
          { label: "Camping", href: "/products/" },
          { label: "Wandern", href: "/products/" },
        ],
      },
    ],
  },
};

export const defaultMegaMenuId = "automotive";

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
  { id: "reifen", label: "REIFEN & FELGEN", href: "/products/" },
  { id: "oele", label: "MOTORENÖLE", href: "/products/?filter=motorenöle", filter: "motorenöle" },
  { id: "bremsen", label: "BREMSEN", href: "/products/?filter=bremsen", filter: "bremsen" },
  { id: "batterien", label: "BATTERIEN", href: "/products/?filter=batterien", filter: "batterien" },
  { id: "filter", label: "FILTER", href: "/products/?filter=filter", filter: "filter" },
  { id: "zuendung", label: "ZÜNDUNG", href: "/products/?filter=zündung", filter: "zündung" },
  { id: "wischer", label: "SCHEIBENWISCHER", href: "/products/?filter=fahrwerk", filter: "fahrwerk" },
  { id: "pflege", label: "PFLEGEPRODUKTE", href: "/products/" },
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
