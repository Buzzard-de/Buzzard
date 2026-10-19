/** Photorealistic tile art — L1 mains and dedicated L2 hubs. */
export function getCategoryVisual(categoryId: string): string {
  return `/images/categories/${categoryId}.webp`;
}

export function getMainCategoryVisual(categoryId: string): string {
  return getCategoryVisual(categoryId);
}

/** Automotive, construction-machine, and livestock L2 hubs have photographs. */
export function hasHubSubcategoryVisual(categoryId: string): boolean {
  return /^cat-05-2[1-7]$/.test(categoryId) || /^cat-5[56]-\d{2}$/.test(categoryId);
}
