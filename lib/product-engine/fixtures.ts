import type { ProductEngineProduct } from "./types";
import { fromBuzzardProduct } from "./adapters/buzzardProduct";
import { getRawProductById } from "@/lib/products/service";

/** QA fixture product IDs from buzzard_products.json catalog. */
export const FIXTURE_PRODUCT_IDS = [
  "reifen-pilot-sport", // Michelin 225/45 R17 tire
  "motoroel-5w30", // 5W-30 engine oil
  "bremsscheibe-280", // Front brake disc 280mm
  "bremsbelaege-vorder", // Front brake pads
] as const;

export function loadFixtureProducts(): ProductEngineProduct[] {
  return FIXTURE_PRODUCT_IDS.map((id) => {
    const raw = getRawProductById(id);
    if (!raw) throw new Error(`Fixture product not found: ${id}`);
    return fromBuzzardProduct(raw);
  });
}

export function loadFixtureProduct(id: string): ProductEngineProduct | undefined {
  const raw = getRawProductById(id);
  return raw ? fromBuzzardProduct(raw) : undefined;
}
