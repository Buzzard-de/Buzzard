import type { CategoryTreeNode } from "@/types";

/**
 * Buzzard 3-Ebenen-Kategoriestruktur (Haupt → Unter → Unter-Unter).
 * IDs: 01 / 01.01 / 01.01.01 — Slugs: textil / textil/damenbekleidung / …
 */
export const categoryTree: CategoryTreeNode[] = [
  {
    id: "01",
    slug: "textil",
    label: "TEXTIL",
    icon: "fashion",
    children: [
      {
        id: "01.01",
        slug: "textil/damenbekleidung",
        label: "DAMENBEKLEIDUNG",
        icon: "fashion",
        children: [
          { id: "01.01.01", slug: "textil/damenbekleidung/kleider", label: "Kleider" },
          { id: "01.01.02", slug: "textil/damenbekleidung/t-shirts", label: "T-Shirts" },
          { id: "01.01.03", slug: "textil/damenbekleidung/blusen", label: "Blusen" },
          { id: "01.01.04", slug: "textil/damenbekleidung/hemden", label: "Hemden" },
          { id: "01.01.05", slug: "textil/damenbekleidung/pullover", label: "Pullover" },
          { id: "01.01.06", slug: "textil/damenbekleidung/strickjacken", label: "Strickjacken" },
          { id: "01.01.07", slug: "textil/damenbekleidung/maentel", label: "Mäntel" },
          { id: "01.01.08", slug: "textil/damenbekleidung/jacken", label: "Jacken" },
          { id: "01.01.09", slug: "textil/damenbekleidung/hosen", label: "Hosen" },
          { id: "01.01.10", slug: "textil/damenbekleidung/roecke", label: "Röcke" },
          { id: "01.01.11", slug: "textil/damenbekleidung/shorts", label: "Shorts" },
          { id: "01.01.12", slug: "textil/damenbekleidung/jogginghosen", label: "Jogginghosen" },
        ],
      },
      {
        id: "01.02",
        slug: "textil/herrenbekleidung",
        label: "HERRENBEKLEIDUNG",
        icon: "fashion",
        children: [
          { id: "01.02.01", slug: "textil/herrenbekleidung/t-shirts", label: "T-Shirts" },
          { id: "01.02.02", slug: "textil/herrenbekleidung/hemden", label: "Hemden" },
          { id: "01.02.03", slug: "textil/herrenbekleidung/pullover", label: "Pullover" },
          { id: "01.02.04", slug: "textil/herrenbekleidung/sweatshirts", label: "Sweatshirts" },
          { id: "01.02.05", slug: "textil/herrenbekleidung/maentel", label: "Mäntel" },
          { id: "01.02.06", slug: "textil/herrenbekleidung/jacken", label: "Jacken" },
          { id: "01.02.07", slug: "textil/herrenbekleidung/hosen", label: "Hosen" },
          { id: "01.02.08", slug: "textil/herrenbekleidung/shorts", label: "Shorts" },
          { id: "01.02.09", slug: "textil/herrenbekleidung/jogginghosen", label: "Jogginghosen" },
        ],
      },
      {
        id: "01.03",
        slug: "textil/kinderbekleidung",
        label: "KINDERBEKLEIDUNG",
        icon: "baby",
        children: [
          { id: "01.03.01", slug: "textil/kinderbekleidung/kleider", label: "Kleider" },
          { id: "01.03.02", slug: "textil/kinderbekleidung/t-shirts", label: "T-Shirts" },
          { id: "01.03.03", slug: "textil/kinderbekleidung/pullover", label: "Pullover" },
          { id: "01.03.04", slug: "textil/kinderbekleidung/hosen", label: "Hosen" },
          { id: "01.03.05", slug: "textil/kinderbekleidung/jacken", label: "Jacken" },
          { id: "01.03.06", slug: "textil/kinderbekleidung/maentel", label: "Mäntel" },
          { id: "01.03.07", slug: "textil/kinderbekleidung/shorts", label: "Shorts" },
          { id: "01.03.08", slug: "textil/kinderbekleidung/jogginghosen", label: "Jogginghosen" },
        ],
      },
    ],
  },
  {
    id: "02",
    slug: "kosmetik-koerperpflege",
    label: "KOSMETIK & KÖRPERPFLEGE",
    icon: "care",
    children: [
      {
        id: "02.01",
        slug: "kosmetik-koerperpflege/hautpflege",
        label: "HAUTPFLEGE",
        icon: "care",
        children: [
          { id: "02.01.01", slug: "kosmetik-koerperpflege/hautpflege/gesichtscremes", label: "Gesichtscremes" },
          { id: "02.01.02", slug: "kosmetik-koerperpflege/hautpflege/seren", label: "Seren" },
          { id: "02.01.03", slug: "kosmetik-koerperpflege/hautpflege/reinigungsprodukte", label: "Reinigungsprodukte" },
          { id: "02.01.04", slug: "kosmetik-koerperpflege/hautpflege/masken", label: "Masken" },
          { id: "02.01.05", slug: "kosmetik-koerperpflege/hautpflege/augenpflege", label: "Augenpflege" },
          { id: "02.01.06", slug: "kosmetik-koerperpflege/hautpflege/sonnenschutz", label: "Sonnenschutz" },
        ],
      },
      {
        id: "02.02",
        slug: "kosmetik-koerperpflege/haarpflege",
        label: "HAARPFLEGE",
        icon: "care",
        children: [
          { id: "02.02.01", slug: "kosmetik-koerperpflege/haarpflege/shampoos", label: "Shampoos" },
          { id: "02.02.02", slug: "kosmetik-koerperpflege/haarpflege/conditioner", label: "Conditioner" },
          { id: "02.02.03", slug: "kosmetik-koerperpflege/haarpflege/styling", label: "Stylingprodukte" },
          { id: "02.02.04", slug: "kosmetik-koerperpflege/haarpflege/haarkuren", label: "Haarkuren" },
        ],
      },
      {
        id: "02.03",
        slug: "kosmetik-koerperpflege/koerperpflege",
        label: "KÖRPERPFLEGE",
        icon: "care",
        children: [
          { id: "02.03.01", slug: "kosmetik-koerperpflege/koerperpflege/duschgel", label: "Duschgel & Seife" },
          { id: "02.03.02", slug: "kosmetik-koerperpflege/koerperpflege/bodylotions", label: "Bodylotions" },
          { id: "02.03.03", slug: "kosmetik-koerperpflege/koerperpflege/deodorants", label: "Deodorants" },
          { id: "02.03.04", slug: "kosmetik-koerperpflege/koerperpflege/handpflege", label: "Handpflege" },
        ],
      },
    ],
  },
  {
    id: "03",
    slug: "reinigungsprodukte",
    label: "REINIGUNGSPRODUKTE",
    icon: "care",
    children: [
      {
        id: "03.01",
        slug: "reinigungsprodukte/haushaltsreinigung",
        label: "HAUSHALTSREINIGUNG",
        icon: "home",
        children: [
          { id: "03.01.01", slug: "reinigungsprodukte/haushaltsreinigung/waschmittel", label: "Waschmittel" },
          { id: "03.01.02", slug: "reinigungsprodukte/haushaltsreinigung/spuelmittel", label: "Spülmittel" },
          { id: "03.01.03", slug: "reinigungsprodukte/haushaltsreinigung/oberflaechenreiniger", label: "Oberflächenreiniger" },
          { id: "03.01.04", slug: "reinigungsprodukte/haushaltsreinigung/allzweckreiniger", label: "Allzweckreiniger" },
          { id: "03.01.05", slug: "reinigungsprodukte/haushaltsreinigung/glasreiniger", label: "Glasreiniger" },
        ],
      },
      {
        id: "03.02",
        slug: "reinigungsprodukte/bad-wc",
        label: "BAD & WC",
        icon: "home",
        children: [
          { id: "03.02.01", slug: "reinigungsprodukte/bad-wc/wc-reiniger", label: "WC-Reiniger" },
          { id: "03.02.02", slug: "reinigungsprodukte/bad-wc/badreiniger", label: "Badreiniger" },
          { id: "03.02.03", slug: "reinigungsprodukte/bad-wc/kalkentferner", label: "Kalkentferner" },
          { id: "03.02.04", slug: "reinigungsprodukte/bad-wc/putztuecher", label: "Putztücher & Schwämme" },
        ],
      },
    ],
  },
  {
    id: "04",
    slug: "schule-buerobedarf",
    label: "SCHULE & BÜROBEDARF",
    icon: "tools",
    children: [
      {
        id: "04.01",
        slug: "schule-buerobedarf/schreibwaren",
        label: "SCHREIBWAREN",
        icon: "tools",
        children: [
          { id: "04.01.01", slug: "schule-buerobedarf/schreibwaren/stifte-marker", label: "Stifte & Marker" },
          { id: "04.01.02", slug: "schule-buerobedarf/schreibwaren/hefte-bloecke", label: "Hefte & Blöcke" },
          { id: "04.01.03", slug: "schule-buerobedarf/schreibwaren/ordner", label: "Ordner & Mappen" },
          { id: "04.01.04", slug: "schule-buerobedarf/schreibwaren/papier", label: "Papier & Etiketten" },
        ],
      },
      {
        id: "04.02",
        slug: "schule-buerobedarf/schulbedarf",
        label: "SCHULBEDARF",
        icon: "baby",
        children: [
          { id: "04.02.01", slug: "schule-buerobedarf/schulbedarf/schulranzen", label: "Schulranzen & Taschen" },
          { id: "04.02.02", slug: "schule-buerobedarf/schulbedarf/federmaeppchen", label: "Federmäppchen" },
          { id: "04.02.03", slug: "schule-buerobedarf/schulbedarf/lineale-zirkel", label: "Lineale & Zirkel" },
          { id: "04.02.04", slug: "schule-buerobedarf/schulbedarf/malbedarf", label: "Malbedarf" },
        ],
      },
      {
        id: "04.03",
        slug: "schule-buerobedarf/buerobedarf",
        label: "BÜROBEDARF",
        icon: "electronics",
        children: [
          { id: "04.03.01", slug: "schule-buerobedarf/buerobedarf/aktenvernichter", label: "Aktenvernichter & Laminiere" },
          { id: "04.03.02", slug: "schule-buerobedarf/buerobedarf/bueromaterial", label: "Büromaterial" },
          { id: "04.03.03", slug: "schule-buerobedarf/buerobedarf/praesentation", label: "Präsentationsbedarf" },
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
