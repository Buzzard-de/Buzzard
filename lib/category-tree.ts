import type { CategoryTreeNode } from "@/types";

/**
 * Buzzard 3-Ebenen-Kategoriestruktur (Haupt → Unter → Unter-Unter).
 * IDs: 01 / 01.01 / 01.01.01 — Slugs: automotive / automotive/wartung-service / …
 * Die Liste ist auf 40 Hauptkategorien erweiterbar; aktuell 13 Hauptkategorien befüllt.
 */
export const categoryTree: CategoryTreeNode[] = [
  {
    id: "01",
    slug: "automotive",
    label: "AUTOMOTIVE",
    icon: "car",
    children: [
      {
        id: "01.01",
        slug: "automotive/wartung-service",
        label: "WARTUNG & SERVICE",
        icon: "oil",
        children: [
          { id: "01.01.01", slug: "automotive/wartung-service/motoroele", label: "Motoröle", productFilter: "motorenöle" },
          { id: "01.01.02", slug: "automotive/wartung-service/filter-oele", label: "Filter & Öle", productFilter: "filter" },
          { id: "01.01.03", slug: "automotive/wartung-service/bremsfluessigkeit", label: "Bremsflüssigkeit", productFilter: "bremsen" },
          { id: "01.01.04", slug: "automotive/wartung-service/kuehlfluessigkeit", label: "Kühlflüssigkeit", productFilter: "motorenöle" },
        ],
      },
      {
        id: "01.02",
        slug: "automotive/ersatzteile",
        label: "ERSATZTEILE",
        icon: "parts",
        children: [
          { id: "01.02.01", slug: "automotive/ersatzteile/motor", label: "Motor & Motorteile" },
          { id: "01.02.02", slug: "automotive/ersatzteile/bremsanlage", label: "Bremsanlage", productFilter: "bremsen" },
          { id: "01.02.03", slug: "automotive/ersatzteile/fahrwerk", label: "Fahrwerk & Lenkung", productFilter: "fahrwerk" },
          { id: "01.02.04", slug: "automotive/ersatzteile/elektrik", label: "Elektrik & Zündung", productFilter: "zündung" },
        ],
      },
      {
        id: "01.03",
        slug: "automotive/zubehoer-tuning",
        label: "ZUBEHÖR & TUNING",
        icon: "tuning",
        children: [
          { id: "01.03.01", slug: "automotive/zubehoer-tuning/innenraum", label: "Innenraum" },
          { id: "01.03.02", slug: "automotive/zubehoer-tuning/beleuchtung", label: "Beleuchtung" },
          { id: "01.03.03", slug: "automotive/zubehoer-tuning/transport", label: "Transport" },
          { id: "01.03.04", slug: "automotive/zubehoer-tuning/reifen-felgen", label: "Reifen & Felgen" },
        ],
      },
      {
        id: "01.04",
        slug: "automotive/pflege-reinigung",
        label: "PFLEGE & REINIGUNG",
        icon: "care",
        children: [
          { id: "01.04.01", slug: "automotive/pflege-reinigung/autopflege", label: "Autopflege" },
          { id: "01.04.02", slug: "automotive/pflege-reinigung/innenraumreiniger", label: "Innenraumreiniger" },
          { id: "01.04.03", slug: "automotive/pflege-reinigung/felgenreiniger", label: "Felgenreiniger" },
          { id: "01.04.04", slug: "automotive/pflege-reinigung/scheibenreiniger", label: "Scheibenreiniger" },
        ],
      },
    ],
  },
  {
    id: "02",
    slug: "sport-outdoor",
    label: "SPORT & OUTDOOR",
    icon: "sport",
    children: [
      {
        id: "02.01",
        slug: "sport-outdoor/fitness",
        label: "FITNESS",
        icon: "sport",
        children: [
          { id: "02.01.01", slug: "sport-outdoor/fitness/trainingsgeraete", label: "Trainingsgeräte" },
          { id: "02.01.02", slug: "sport-outdoor/fitness/yoga-pilates", label: "Yoga & Pilates" },
        ],
      },
      {
        id: "02.02",
        slug: "sport-outdoor/outdoor",
        label: "OUTDOOR",
        icon: "garden",
        children: [
          { id: "02.02.01", slug: "sport-outdoor/outdoor/camping", label: "Camping" },
          { id: "02.02.02", slug: "sport-outdoor/outdoor/wandern", label: "Wandern" },
        ],
      },
    ],
  },
  {
    id: "03",
    slug: "haus-wohnen",
    label: "HAUS & WOHNEN",
    icon: "home",
    children: [
      {
        id: "03.01",
        slug: "haus-wohnen/moebel",
        label: "MÖBEL",
        icon: "home",
        children: [
          { id: "03.01.01", slug: "haus-wohnen/moebel/wohnzimmer", label: "Wohnzimmer" },
          { id: "03.01.02", slug: "haus-wohnen/moebel/schlafzimmer", label: "Schlafzimmer" },
        ],
      },
      {
        id: "03.02",
        slug: "haus-wohnen/deko",
        label: "DEKO & ACCESSOIRES",
        icon: "home",
        children: [
          { id: "03.02.01", slug: "haus-wohnen/deko/beleuchtung", label: "Beleuchtung" },
          { id: "03.02.02", slug: "haus-wohnen/deko/textilien", label: "Textilien" },
        ],
      },
    ],
  },
  {
    id: "04",
    slug: "garten",
    label: "GARTEN",
    icon: "garden",
    children: [
      {
        id: "04.01",
        slug: "garten/pflege",
        label: "GARTENPFLEGE",
        icon: "garden",
        children: [
          { id: "04.01.01", slug: "garten/pflege/rasenmaeher", label: "Rasenmäher" },
          { id: "04.01.02", slug: "garten/pflege/bewaesserung", label: "Bewässerung" },
        ],
      },
    ],
  },
  {
    id: "05",
    slug: "werkzeug-maschinen",
    label: "WERKZEUG & MASCHINEN",
    icon: "tools",
    children: [
      {
        id: "05.01",
        slug: "werkzeug-maschinen/handwerkzeug",
        label: "HANDWERKZEUG",
        icon: "tools",
        children: [
          { id: "05.01.01", slug: "werkzeug-maschinen/handwerkzeug/schraubendreher", label: "Schraubendreher & Bits" },
          { id: "05.01.02", slug: "werkzeug-maschinen/handwerkzeug/hammer-zangen", label: "Hammer & Zangen" },
        ],
      },
    ],
  },
  {
    id: "06",
    slug: "bau-renovierung",
    label: "BAU & RENOVIERUNG",
    icon: "build",
    children: [
      {
        id: "06.01",
        slug: "bau-renovierung/baumaterial",
        label: "BAUMATERIAL",
        icon: "build",
        children: [
          { id: "06.01.01", slug: "bau-renovierung/baumaterial/holz", label: "Holz & Platten" },
          { id: "06.01.02", slug: "bau-renovierung/baumaterial/befestigung", label: "Befestigungstechnik" },
        ],
      },
    ],
  },
  {
    id: "07",
    slug: "elektronik",
    label: "ELEKTRONIK",
    icon: "electronics",
    children: [
      {
        id: "07.01",
        slug: "elektronik/computer",
        label: "COMPUTER & ZUBEHÖR",
        icon: "electronics",
        children: [
          { id: "07.01.01", slug: "elektronik/computer/laptops", label: "Laptops" },
          { id: "07.01.02", slug: "elektronik/computer/peripherie", label: "Peripherie" },
        ],
      },
    ],
  },
  {
    id: "08",
    slug: "haushaltsgeraete",
    label: "HAUSHALTSGERÄTE",
    icon: "appliance",
    children: [
      {
        id: "08.01",
        slug: "haushaltsgeraete/kueche",
        label: "KÜCHE",
        icon: "appliance",
        children: [
          { id: "08.01.01", slug: "haushaltsgeraete/kueche/kleingeraete", label: "Kleingeräte" },
          { id: "08.01.02", slug: "haushaltsgeraete/kueche/grossgeraete", label: "Großgeräte" },
        ],
      },
    ],
  },
  {
    id: "09",
    slug: "pflege-reinigung",
    label: "PFLEGE & REINIGUNG",
    icon: "care",
    children: [
      {
        id: "09.01",
        slug: "pflege-reinigung/koerperpflege",
        label: "KÖRPERPFLEGE",
        icon: "care",
        children: [
          { id: "09.01.01", slug: "pflege-reinigung/koerperpflege/hautpflege", label: "Hautpflege" },
          { id: "09.01.02", slug: "pflege-reinigung/koerperpflege/haarpflege", label: "Haarpflege" },
        ],
      },
    ],
  },
  {
    id: "10",
    slug: "tierbedarf",
    label: "TIERBEDARF",
    icon: "pet",
    children: [
      {
        id: "10.01",
        slug: "tierbedarf/hunde",
        label: "HUNDE",
        icon: "pet",
        children: [
          { id: "10.01.01", slug: "tierbedarf/hunde/futter", label: "Futter" },
          { id: "10.01.02", slug: "tierbedarf/hunde/spielzeug", label: "Spielzeug" },
        ],
      },
    ],
  },
  {
    id: "11",
    slug: "lebensmittel-getraenke",
    label: "LEBENSMITTEL & GETRÄNKE",
    icon: "food",
    children: [
      {
        id: "11.01",
        slug: "lebensmittel-getraenke/getraenke",
        label: "GETRÄNKE",
        icon: "food",
        children: [
          { id: "11.01.01", slug: "lebensmittel-getraenke/getraenke/wasser", label: "Wasser & Softdrinks" },
          { id: "11.01.02", slug: "lebensmittel-getraenke/getraenke/kaffee-tee", label: "Kaffee & Tee" },
        ],
      },
    ],
  },
  {
    id: "12",
    slug: "baby-kind",
    label: "BABY & KIND",
    icon: "baby",
    children: [
      {
        id: "12.01",
        slug: "baby-kind/ausstattung",
        label: "AUSSTATTUNG",
        icon: "baby",
        children: [
          { id: "12.01.01", slug: "baby-kind/ausstattung/kinderwagen", label: "Kinderwagen" },
          { id: "12.01.02", slug: "baby-kind/ausstattung/kindersitze", label: "Kindersitze" },
        ],
      },
    ],
  },
  {
    id: "13",
    slug: "mode-accessoires",
    label: "MODE & ACCESSOIRES",
    icon: "fashion",
    children: [
      {
        id: "13.01",
        slug: "mode-accessoires/damen",
        label: "DAMENBEKLEIDUNG",
        icon: "fashion",
        children: [
          { id: "13.01.01", slug: "mode-accessoires/damen/kleider", label: "Kleider" },
          { id: "13.01.02", slug: "mode-accessoires/damen/hosen", label: "Hosen" },
        ],
      },
      {
        id: "13.02",
        slug: "mode-accessoires/herren",
        label: "HERRENBEKLEIDUNG",
        icon: "fashion",
        children: [
          { id: "13.02.01", slug: "mode-accessoires/herren/hemden", label: "Hemden" },
          { id: "13.02.02", slug: "mode-accessoires/herren/hosen", label: "Hosen" },
        ],
      },
    ],
  },
];

export const defaultMainCategoryId = "01";

export function findMainCategory(mainId: string): CategoryTreeNode | undefined {
  return categoryTree.find((cat) => cat.id === mainId);
}

export function getSubCategories(mainId: string): CategoryTreeNode[] {
  return findMainCategory(mainId)?.children ?? [];
}

export function getSubSubCategories(mainId: string, subId: string): CategoryTreeNode[] {
  return getSubCategories(mainId).find((sub) => sub.id === subId)?.children ?? [];
}

export function getDefaultSubCategoryId(mainId: string): string {
  return getSubCategories(mainId)[0]?.id ?? "";
}

export function findCategoryBySlug(slug: string): CategoryTreeNode | undefined {
  for (const main of categoryTree) {
    if (main.slug === slug) return main;
    for (const sub of main.children ?? []) {
      if (sub.slug === slug) return sub;
      for (const leaf of sub.children ?? []) {
        if (leaf.slug === slug) return leaf;
      }
    }
  }
  return undefined;
}

export function categoryHref(node: Pick<CategoryTreeNode, "slug" | "productFilter">): string {
  const params = new URLSearchParams();
  params.set("kategorie", node.slug);
  if (node.productFilter) params.set("filter", node.productFilter);
  return `/products/?${params.toString()}`;
}

export function formatCategoryLabel(node: Pick<CategoryTreeNode, "id" | "label">): string {
  return `${node.id}. ${node.label}`;
}
