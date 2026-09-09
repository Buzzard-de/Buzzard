import type { NormalizeSupplierInput, ProductEngineProduct } from "./types";
import { normalizedRecordToEngineProduct, normalizeSupplierProduct } from "./normalization";
import { validateProduct } from "./validation";
import { findDuplicateProduct } from "./duplicate";
import { upsertRegistryProduct } from "./registry";
import { emitProductEvent } from "./events";

export interface IngestionResult {
  ok: boolean;
  product?: ProductEngineProduct;
  validation?: ReturnType<typeof validateProduct>;
  duplicate?: ReturnType<typeof findDuplicateProduct>;
  stages: Array<{ stage: string; status: "PASS" | "FAIL" | "WARN" }>;
}

export function ingestSupplierProduct(input: NormalizeSupplierInput): IngestionResult {
  const stages: IngestionResult["stages"] = [];

  let normalized;
  try {
    normalized = normalizeSupplierProduct(input);
    stages.push({ stage: "normalization", status: "PASS" });
  } catch {
    stages.push({ stage: "normalization", status: "FAIL" });
    return { ok: false, stages };
  }

  const product = normalizedRecordToEngineProduct(normalized, input);
  stages.push({ stage: "engine_mapping", status: "PASS" });

  const duplicate = findDuplicateProduct(product);
  if (duplicate.match) {
    stages.push({ stage: "duplicate_detection", status: "WARN" });
  } else {
    stages.push({ stage: "duplicate_detection", status: "PASS" });
  }

  const validation = validateProduct(product);
  if (!validation.valid) {
    product.status = "PENDING_REVIEW";
    stages.push({ stage: "validation", status: "FAIL" });
  } else {
    stages.push({ stage: "validation", status: "PASS" });
  }

  const saved = upsertRegistryProduct(product);
  emitProductEvent("PRODUCT_CREATED", saved.productId, { sourceType: input.sourceType });

  return {
    ok: validation.valid && !duplicate.match,
    product: saved,
    validation,
    duplicate,
    stages,
  };
}
