import type { Product } from "@/types";
import type { BuzzardCategory } from "@/lib/categories/types";
import { collectDescendantIds, isCategoryOrDescendant } from "@/lib/categories/service";
import { sanitizeSearchQuery } from "@/lib/security";

export const products: Product[] = [
  {
    id: "bremsscheibe-280",
    name: "Bremsscheibe Vorderachse 280mm",
    category: "bremsen",
    categoryLabel: "Bremsen",
    categoryId: "cat-05-03",
    price: 34.9,
    imageKey: "bremsen-disc",
    description: "Hochwertige Bremsscheibe für die Vorderachse. Durchmesser 280 mm, OEM-kompatibel.",
    stock: 24,
  },
  {
    id: "bremsbelaege-vorder",
    name: "Bremsbeläge Satz Vorderachse",
    category: "bremsen",
    categoryLabel: "Bremsen",
    categoryId: "cat-05-03",
    price: 28.5,
    imageKey: "bremsen-pads",
    description: "Bremsbelag-Satz für die Vorderachse mit Verschleißanzeiger.",
    stock: 31,
  },
  {
    id: "motoroel-5w30",
    name: "Motoröl 5W-30 Fullsynthetic 5L",
    category: "motorenöle",
    categoryLabel: "Motorenöle",
    categoryId: "cat-05-01",
    price: 42.9,
    imageKey: "oel",
    description: "Vollsynthetisches Motoröl 5W-30 für Benzin- und Dieselmotoren.",
    stock: 50,
  },
  {
    id: "oelfilter",
    name: "Ölfilter Universal OEM-kompatibel",
    category: "filter",
    categoryLabel: "Filter",
    categoryId: "cat-05-02",
    price: 8.9,
    imageKey: "filter-oil",
    description: "Universal Ölfilter mit hoher Filtrationsleistung.",
    stock: 80,
  },
  {
    id: "innenraumfilter",
    name: "Innenraumfilter Pollenfilter Premium",
    category: "filter",
    categoryLabel: "Filter",
    categoryId: "cat-05-02",
    price: 12.5,
    imageKey: "filter-cabin",
    description: "Aktivkohle-Innenraumfilter für saubere Luft im Fahrzeug.",
    stock: 45,
  },
  {
    id: "zuendkerze-ngk",
    name: "Zündkerze Iridium IX NGK",
    category: "zündung",
    categoryLabel: "Zündung",
    categoryId: "cat-05-11",
    price: 9.9,
    imageKey: "zuendung",
    description: "Iridium-Zündkerze für optimale Zündung und lange Lebensdauer.",
    stock: 120,
  },
  {
    id: "batterie-72ah",
    name: "Starterbatterie 12V 72Ah 680A",
    category: "batterien",
    categoryLabel: "Batterien",
    categoryId: "cat-05-04",
    price: 89.9,
    imageKey: "batterie",
    description: "Starterbatterie 72Ah mit 680A Kaltstartstrom.",
    stock: 15,
  },
  {
    id: "stossdaempfer",
    name: "Stoßdämpfer Vorderachse Gas",
    category: "fahrwerk",
    categoryLabel: "Fahrwerk",
    categoryId: "cat-05-11",
    price: 64.9,
    imageKey: "fahrwerk",
    description: "Gasdruck-Stoßdämpfer für die Vorderachse.",
    stock: 12,
  },
  {
    id: "getriebeoel-75w90",
    name: "Getriebeöl 75W-90 Vollsynthetisch 1L",
    category: "motorenöle",
    categoryLabel: "Motorenöle",
    categoryId: "cat-05-01",
    price: 18.9,
    imageKey: "oel-gear",
    description: "Vollsynthetisches Getriebeöl 75W-90 für Schaltgetriebe.",
    stock: 38,
  },
  {
    id: "bremsfluessigkeit-dot4",
    name: "Bremsflüssigkeit DOT 4 500ml",
    category: "bremsen",
    categoryLabel: "Bremsen",
    categoryId: "cat-05-03",
    price: 7.5,
    imageKey: "bremsen-fluid",
    description: "Bremsflüssigkeit DOT 4, 500 ml Flasche.",
    stock: 60,
  },
  {
    id: "keilrippenriemen",
    name: "Keilrippenriemen 6PK1548",
    category: "fahrwerk",
    categoryLabel: "Fahrwerk",
    categoryId: "cat-05-11",
    price: 22.9,
    imageKey: "fahrwerk-belt",
    description: "Keilrippenriemen 6PK1548 für Nebenaggregate.",
    stock: 27,
  },
  {
    id: "frostschutz-g12",
    name: "Kühlerfrostschutzmittel G12+ 5L",
    category: "motorenöle",
    categoryLabel: "Motorenöle",
    categoryId: "cat-05-01",
    price: 16.9,
    imageKey: "oel-coolant",
    description: "Frostschutzmittel G12+ für Kühlwasserkreislauf, 5 Liter.",
    stock: 33,
  },
  {
    id: "scheibenwischer-set",
    name: "Bosch Aerotwin Scheibenwischer Set",
    category: "fahrwerk",
    categoryLabel: "Fahrwerk",
    categoryId: "cat-05-07",
    price: 19.99,
    imageKey: "wischer",
    description: "Aerotwin Wischerblatt-Set für optimale Sicht bei Regen.",
    stock: 42,
  },
  {
    id: "reifen-pilot-sport",
    name: "Michelin Pilot Sport 4 Reifen 225/45 R17",
    category: "fahrwerk",
    categoryLabel: "Fahrwerk",
    categoryId: "cat-05-05",
    price: 89.99,
    imageKey: "tire",
    description: "Sommerreifen Michelin Pilot Sport 4, 225/45 R17.",
    stock: 8,
  },
];

export function formatPrice(price: number): string {
  return price.toFixed(2).replace(".", ",") + " €";
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

const legacyFilterToCategoryId: Record<string, string> = {
  bremsen: "cat-05-03",
  motorenöle: "cat-05-01",
  filter: "cat-05-02",
  zündung: "cat-05-11",
  batterien: "cat-05-04",
  fahrwerk: "cat-05-11",
};

export function getProductsForCategory(category: BuzzardCategory, limit?: number): Product[] {
  const ids = new Set(collectDescendantIds(category.id));
  const matched = products.filter((p) => ids.has(p.categoryId));
  return limit ? matched.slice(0, limit) : matched;
}

export function filterProducts(
  items: Product[],
  filter: string,
  query?: string | null,
  buzzardCategory?: BuzzardCategory | null
): Product[] {
  let result = items;

  if (buzzardCategory) {
    result = result.filter((p) => isCategoryOrDescendant(p.categoryId, buzzardCategory.id));
  } else if (filter && filter !== "alle") {
    if (filter.startsWith("cat-")) {
      result = result.filter((p) => isCategoryOrDescendant(p.categoryId, filter));
    } else {
      const categoryId = legacyFilterToCategoryId[filter];
      if (categoryId) {
        result = result.filter((p) => isCategoryOrDescendant(p.categoryId, categoryId));
      } else {
        result = result.filter((p) => p.category === filter);
      }
    }
  }

  if (query) {
    const q = sanitizeSearchQuery(query).toLowerCase();
    if (!q) return result;
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }

  return result;
}

export const FREE_SHIPPING_THRESHOLD = 79;

export function getShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : 5.99;
}
