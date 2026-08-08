import type { CategoryTreeNode } from "@/types";

/**
 * Buzzard 3-Ebenen-Kategoriestruktur (Haupt → Unter → Unter-Unter).
 * IDs: 01 / 01.01 / 01.01.01
 * Slugs (Englisch): textile / textile/women-clothing / textile/women-clothing/dresses
 * Labels (Deutsch): TEXTIL / DAMENBEKLEIDUNG / Kleider
 */
export const categoryTree: CategoryTreeNode[] = [
  {
    id: "01",
    slug: "textile",
    label: "TEXTIL",
    icon: "fashion",
    children: [
      {
        id: "01.01",
        slug: "textile/women-clothing",
        label: "DAMENBEKLEIDUNG",
        icon: "fashion",
        children: [
          { id: "01.01.01", slug: "textile/women-clothing/dresses", label: "Kleider" },
          { id: "01.01.02", slug: "textile/women-clothing/t-shirts", label: "T-Shirts" },
          { id: "01.01.03", slug: "textile/women-clothing/blouses", label: "Blusen" },
          { id: "01.01.04", slug: "textile/women-clothing/shirts", label: "Hemden" },
          { id: "01.01.05", slug: "textile/women-clothing/sweaters", label: "Pullover" },
          { id: "01.01.06", slug: "textile/women-clothing/cardigans", label: "Strickjacken" },
          { id: "01.01.07", slug: "textile/women-clothing/coats", label: "Mäntel" },
          { id: "01.01.08", slug: "textile/women-clothing/jackets", label: "Jacken" },
          { id: "01.01.09", slug: "textile/women-clothing/trousers", label: "Hosen" },
          { id: "01.01.10", slug: "textile/women-clothing/skirts", label: "Röcke" },
          { id: "01.01.11", slug: "textile/women-clothing/shorts", label: "Shorts" },
          { id: "01.01.12", slug: "textile/women-clothing/sweatpants", label: "Jogginghosen" },
        ],
      },
      {
        id: "01.02",
        slug: "textile/men-clothing",
        label: "HERRENBEKLEIDUNG",
        icon: "fashion",
        children: [
          { id: "01.02.01", slug: "textile/men-clothing/t-shirts", label: "T-Shirts" },
          { id: "01.02.02", slug: "textile/men-clothing/shirts", label: "Hemden" },
          { id: "01.02.03", slug: "textile/men-clothing/sweaters", label: "Pullover" },
          { id: "01.02.04", slug: "textile/men-clothing/sweatshirts", label: "Sweatshirts" },
          { id: "01.02.05", slug: "textile/men-clothing/coats", label: "Mäntel" },
          { id: "01.02.06", slug: "textile/men-clothing/jackets", label: "Jacken" },
          { id: "01.02.07", slug: "textile/men-clothing/trousers", label: "Hosen" },
          { id: "01.02.08", slug: "textile/men-clothing/shorts", label: "Shorts" },
          { id: "01.02.09", slug: "textile/men-clothing/sweatpants", label: "Jogginghosen" },
        ],
      },
      {
        id: "01.03",
        slug: "textile/kids-clothing",
        label: "KINDERBEKLEIDUNG",
        icon: "baby",
        children: [
          { id: "01.03.01", slug: "textile/kids-clothing/dresses", label: "Kleider" },
          { id: "01.03.02", slug: "textile/kids-clothing/t-shirts", label: "T-Shirts" },
          { id: "01.03.03", slug: "textile/kids-clothing/sweaters", label: "Pullover" },
          { id: "01.03.04", slug: "textile/kids-clothing/trousers", label: "Hosen" },
          { id: "01.03.05", slug: "textile/kids-clothing/jackets", label: "Jacken" },
          { id: "01.03.06", slug: "textile/kids-clothing/coats", label: "Mäntel" },
          { id: "01.03.07", slug: "textile/kids-clothing/shorts", label: "Shorts" },
          { id: "01.03.08", slug: "textile/kids-clothing/sweatpants", label: "Jogginghosen" },
        ],
      },
    ],
  },
  {
    id: "02",
    slug: "cosmetics-personal-care",
    label: "KOSMETIK & KÖRPERPFLEGE",
    icon: "care",
    children: [
      {
        id: "02.01",
        slug: "cosmetics-personal-care/skin-care",
        label: "HAUTPFLEGE",
        icon: "care",
        children: [
          { id: "02.01.01", slug: "cosmetics-personal-care/skin-care/face-creams", label: "Gesichtscremes" },
          { id: "02.01.02", slug: "cosmetics-personal-care/skin-care/serums", label: "Seren" },
          { id: "02.01.03", slug: "cosmetics-personal-care/skin-care/cleansers", label: "Reinigungsprodukte" },
          { id: "02.01.04", slug: "cosmetics-personal-care/skin-care/masks", label: "Masken" },
          { id: "02.01.05", slug: "cosmetics-personal-care/skin-care/eye-care", label: "Augenpflege" },
          { id: "02.01.06", slug: "cosmetics-personal-care/skin-care/sun-protection", label: "Sonnenschutz" },
        ],
      },
      {
        id: "02.02",
        slug: "cosmetics-personal-care/hair-care",
        label: "HAARPFLEGE",
        icon: "care",
        children: [
          { id: "02.02.01", slug: "cosmetics-personal-care/hair-care/shampoos", label: "Shampoo" },
          { id: "02.02.02", slug: "cosmetics-personal-care/hair-care/conditioners", label: "Haarspülung" },
          { id: "02.02.03", slug: "cosmetics-personal-care/hair-care/styling-products", label: "Stylingprodukte" },
          { id: "02.02.04", slug: "cosmetics-personal-care/hair-care/hair-treatments", label: "Haarkuren" },
        ],
      },
      {
        id: "02.03",
        slug: "cosmetics-personal-care/body-care",
        label: "KÖRPERPFLEGE",
        icon: "care",
        children: [
          { id: "02.03.01", slug: "cosmetics-personal-care/body-care/shower-gel", label: "Duschgel & Seife" },
          { id: "02.03.02", slug: "cosmetics-personal-care/body-care/body-lotions", label: "Bodylotion" },
          { id: "02.03.03", slug: "cosmetics-personal-care/body-care/deodorants", label: "Deo" },
          { id: "02.03.04", slug: "cosmetics-personal-care/body-care/hand-care", label: "Handpflege" },
        ],
      },
    ],
  },
  {
    id: "03",
    slug: "cleaning-products",
    label: "REINIGUNGSPRODUKTE",
    icon: "care",
    children: [
      {
        id: "03.01",
        slug: "cleaning-products/household-cleaning",
        label: "HAUSHALTSREINIGUNG",
        icon: "home",
        children: [
          { id: "03.01.01", slug: "cleaning-products/household-cleaning/laundry-detergent", label: "Waschmittel" },
          { id: "03.01.02", slug: "cleaning-products/household-cleaning/dish-detergent", label: "Spülmittel" },
          { id: "03.01.03", slug: "cleaning-products/household-cleaning/surface-cleaners", label: "Oberflächenreiniger" },
          { id: "03.01.04", slug: "cleaning-products/household-cleaning/all-purpose-cleaners", label: "Allzweckreiniger" },
          { id: "03.01.05", slug: "cleaning-products/household-cleaning/glass-cleaners", label: "Glasreiniger" },
        ],
      },
      {
        id: "03.02",
        slug: "cleaning-products/bath-toilet",
        label: "BAD & WC",
        icon: "home",
        children: [
          { id: "03.02.01", slug: "cleaning-products/bath-toilet/toilet-cleaners", label: "WC-Reiniger" },
          { id: "03.02.02", slug: "cleaning-products/bath-toilet/bathroom-cleaners", label: "Badreiniger" },
          { id: "03.02.03", slug: "cleaning-products/bath-toilet/limescale-removers", label: "Kalkentferner" },
          { id: "03.02.04", slug: "cleaning-products/bath-toilet/cleaning-cloths", label: "Putztücher & Schwämme" },
        ],
      },
    ],
  },
  {
    id: "04",
    slug: "school-office-supplies",
    label: "SCHULE & BÜROBEDARF",
    icon: "tools",
    children: [
      {
        id: "04.01",
        slug: "school-office-supplies/stationery",
        label: "SCHREIBWAREN",
        icon: "tools",
        children: [
          { id: "04.01.01", slug: "school-office-supplies/stationery/pens-markers", label: "Stifte & Marker" },
          { id: "04.01.02", slug: "school-office-supplies/stationery/notebooks", label: "Hefte & Blöcke" },
          { id: "04.01.03", slug: "school-office-supplies/stationery/folders", label: "Ordner & Mappen" },
          { id: "04.01.04", slug: "school-office-supplies/stationery/paper-labels", label: "Papier & Etiketten" },
        ],
      },
      {
        id: "04.02",
        slug: "school-office-supplies/school-supplies",
        label: "SCHULBEDARF",
        icon: "baby",
        children: [
          { id: "04.02.01", slug: "school-office-supplies/school-supplies/school-bags", label: "Schulranzen & Taschen" },
          { id: "04.02.02", slug: "school-office-supplies/school-supplies/pencil-cases", label: "Federmäppchen" },
          { id: "04.02.03", slug: "school-office-supplies/school-supplies/rulers-compasses", label: "Lineale & Zirkel" },
          { id: "04.02.04", slug: "school-office-supplies/school-supplies/art-supplies", label: "Malbedarf" },
        ],
      },
      {
        id: "04.03",
        slug: "school-office-supplies/office-supplies",
        label: "BÜROBEDARF",
        icon: "electronics",
        children: [
          { id: "04.03.01", slug: "school-office-supplies/office-supplies/shredders-laminators", label: "Aktenvernichter & Laminiere" },
          { id: "04.03.02", slug: "school-office-supplies/office-supplies/office-materials", label: "Büromaterial" },
          { id: "04.03.03", slug: "school-office-supplies/office-supplies/presentation-supplies", label: "Präsentationsbedarf" },
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
