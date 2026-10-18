/** Photorealistic tile art — L1 mains and dedicated L2 hubs. */
export function getCategoryVisual(categoryId: string): string {
  return `/images/categories/${categoryId}.webp`;
}

export function getMainCategoryVisual(categoryId: string): string {
  return getCategoryVisual(categoryId);
}

/** Construction-machine and livestock L2 hubs have their own photographs. */
export function hasHubSubcategoryVisual(categoryId: string): boolean {
  return /^cat-5[56]-\d{2}$/.test(categoryId);
}
