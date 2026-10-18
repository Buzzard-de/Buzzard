/** Photorealistic L1 tile art — one WebP per customer-facing main category. */
export function getMainCategoryVisual(categoryId: string): string {
  return `/images/categories/${categoryId}.webp`;
}
