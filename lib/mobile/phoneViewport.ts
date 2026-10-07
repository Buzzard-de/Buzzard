/**
 * Phone storefront viewport — portrait AND landscape.
 * Landscape phones (e.g. 844×390) exceed 767px width but stay phone layout.
 * Tablets (768×1024) and desktop are excluded: short-height branch is capped at 1023px width.
 */
export const PHONE_MEDIA_QUERY =
  "(max-width: 767px), (max-width: 1023px) and (max-height: 500px)";

export const PHONE_CSS_MEDIA = `@media ${PHONE_MEDIA_QUERY}`;

export function isPhoneViewport(width: number, height: number): boolean {
  if (width <= 767) return true;
  return width <= 1023 && height <= 500;
}
