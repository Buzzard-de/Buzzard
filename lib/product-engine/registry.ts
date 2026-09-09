import type { ProductEngineProduct } from "./types";
import { fromBuzzardProduct } from "./adapters/buzzardProduct";
import catalog from "@/data/buzzard_products.json";
import type { BuzzardProduct } from "@/lib/products/types";

const products = new Map<string, ProductEngineProduct>();
const skuIndex = new Map<string, string>();
const eanIndex = new Map<string, string>();

function indexProduct(product: ProductEngineProduct): void {
  products.set(product.productId, product);
  if (product.sku) skuIndex.set(product.sku.toUpperCase(), product.productId);
  const ean = product.ean || product.gtin;
  if (ean) eanIndex.set(ean, product.productId);
}

function ensureLoaded(): void {
  if (products.size > 0) return;
  for (const raw of (catalog as { products: BuzzardProduct[] }).products) {
    indexProduct(fromBuzzardProduct(raw));
  }
}

export function getRegistryCount(): number {
  ensureLoaded();
  return products.size;
}

export function listRegistryProducts(): ProductEngineProduct[] {
  ensureLoaded();
  return [...products.values()];
}

export function getRegistryProduct(productId: string): ProductEngineProduct | undefined {
  ensureLoaded();
  return products.get(productId);
}

export function getRegistryProductBySku(sku: string): ProductEngineProduct | undefined {
  ensureLoaded();
  const id = skuIndex.get(String(sku).toUpperCase());
  return id ? products.get(id) : undefined;
}

export function getRegistryProductByEan(ean: string): ProductEngineProduct | undefined {
  ensureLoaded();
  const id = eanIndex.get(String(ean).trim());
  return id ? products.get(id) : undefined;
}

export function upsertRegistryProduct(product: ProductEngineProduct): ProductEngineProduct {
  ensureLoaded();
  product.updatedAt = new Date().toISOString();
  indexProduct(product);
  return product;
}

export function removeRegistryProduct(productId: string): boolean {
  ensureLoaded();
  const existing = products.get(productId);
  if (!existing) return false;
  products.delete(productId);
  if (existing.sku) skuIndex.delete(existing.sku.toUpperCase());
  const ean = existing.ean || existing.gtin;
  if (ean) eanIndex.delete(ean);
  return true;
}
