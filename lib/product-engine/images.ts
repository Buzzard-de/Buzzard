import type { ProductImage, ProductImageType } from "./types";

const ALLOWED_IMAGE_TYPES: ProductImageType[] = ["MAIN", "GALLERY", "TECHNICAL", "PACKAGING"];

export function sanitizeImageUrl(url: string): string | null {
  const trimmed = String(url || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeProductImage(
  raw: { url?: string; alt?: string; sortOrder?: number; type?: string },
  fallbackAlt?: string
): ProductImage | null {
  const url = sanitizeImageUrl(raw.url || "");
  if (!url) return null;
  const type = ALLOWED_IMAGE_TYPES.includes(raw.type as ProductImageType)
    ? (raw.type as ProductImageType)
    : "GALLERY";
  return {
    url,
    alt: raw.alt || fallbackAlt,
    sortOrder: Number.isFinite(raw.sortOrder) ? Number(raw.sortOrder) : 0,
    type,
  };
}

export function normalizeProductImages(
  urls: string[] | undefined,
  fallbackAlt?: string
): ProductImage[] {
  if (!urls?.length) return [];
  return urls
    .map((url, i) =>
      normalizeProductImage({ url, sortOrder: i, type: i === 0 ? "MAIN" : "GALLERY" }, fallbackAlt)
    )
    .filter((img): img is ProductImage => img !== null);
}

export function validateProductImages(images: ProductImage[]): string[] {
  const errors: string[] = [];
  if (!images.length) errors.push("IMAGES_MISSING");
  const mainCount = images.filter((i) => i.type === "MAIN").length;
  if (images.length > 0 && mainCount === 0) errors.push("MAIN_IMAGE_MISSING");
  for (const img of images) {
    if (!sanitizeImageUrl(img.url)) errors.push("INVALID_IMAGE_URL");
  }
  return [...new Set(errors)];
}
