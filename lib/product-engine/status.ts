import type { ProductEngineStatus } from "./types";
import type { ProductStatus, StockStatus } from "@/lib/products/types";

const VALID_TRANSITIONS: Record<ProductEngineStatus, ProductEngineStatus[]> = {
  DRAFT: ["PENDING_REVIEW", "ARCHIVED"],
  PENDING_REVIEW: ["ACTIVE", "DRAFT", "ARCHIVED"],
  ACTIVE: ["PAUSED", "OUT_OF_STOCK", "DISCONTINUED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "DISCONTINUED", "ARCHIVED"],
  OUT_OF_STOCK: ["ACTIVE", "DISCONTINUED", "ARCHIVED"],
  DISCONTINUED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionStatus(from: ProductEngineStatus, to: ProductEngineStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function mapStorefrontStatus(status: ProductStatus, stockStatus?: StockStatus): ProductEngineStatus {
  if (stockStatus === "out_of_stock") return "OUT_OF_STOCK";
  switch (status) {
    case "draft":
      return "DRAFT";
    case "active":
      return "ACTIVE";
    case "paused":
      return "PAUSED";
    case "archived":
      return "ARCHIVED";
    default:
      return "DRAFT";
  }
}

export function resolveStatusFromStock(
  current: ProductEngineStatus,
  quantity: number,
  options?: { manuallyDiscontinued?: boolean }
): ProductEngineStatus {
  if (options?.manuallyDiscontinued || current === "DISCONTINUED") return "DISCONTINUED";
  if (current === "ARCHIVED" || current === "PAUSED" || current === "DRAFT" || current === "PENDING_REVIEW") {
    return current;
  }
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (current === "OUT_OF_STOCK") return "ACTIVE";
  return current;
}
