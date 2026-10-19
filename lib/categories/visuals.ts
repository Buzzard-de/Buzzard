/** Photorealistic tile art — L1 mains and dedicated L2 hubs. */
export function getCategoryVisual(categoryId: string): string {
  return `/images/categories/${categoryId}.webp`;
}

export function getMainCategoryVisual(categoryId: string): string {
  return getCategoryVisual(categoryId);
}

/** Dedicated L2 hubs with photographs. */
export function hasHubSubcategoryVisual(categoryId: string): boolean {
  return (
    /^cat-01-\d{2}$/.test(categoryId) ||
    /^cat-02-\d{2}$/.test(categoryId) ||
    /^cat-15-\d{2}$/.test(categoryId) ||
    /^cat-16-\d{2}$/.test(categoryId) ||
    /^cat-42-\d{2}$/.test(categoryId) ||
    /^cat-44-\d{2}$/.test(categoryId) ||
    /^cat-27-\d{2}$/.test(categoryId) ||
    /^cat-45-\d{2}$/.test(categoryId) ||
    /^cat-52-\d{2}$/.test(categoryId) ||
    /^cat-17-\d{2}$/.test(categoryId) ||
    /^cat-18-\d{2}$/.test(categoryId) ||
    /^cat-47-\d{2}$/.test(categoryId) ||
    /^cat-04-\d{2}$/.test(categoryId) ||
    /^cat-10-\d{2}$/.test(categoryId) ||
    /^cat-11-\d{2}$/.test(categoryId) ||
    /^cat-35-\d{2}$/.test(categoryId) ||
    /^cat-24-\d{2}$/.test(categoryId) ||
    /^cat-13-\d{2}$/.test(categoryId) ||
    /^cat-03-\d{2}$/.test(categoryId) ||
    /^cat-46-\d{2}$/.test(categoryId) ||
    /^cat-06-\d{2}$/.test(categoryId) ||
    /^cat-26-\d{2}$/.test(categoryId) ||
    /^cat-05-2[1-7]$/.test(categoryId) ||
    /^cat-5[56]-\d{2}$/.test(categoryId)
  );
}
