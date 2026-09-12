import {
  ingestStorefrontPurchaseSignalResolved,
  resolveOrderEngineOrderId,
} from "@/lib/commerce/orderEngineBridge";

import type { CollectEventResult } from "../types";

export function ingestStorefrontPurchaseSignal(
  orderId: string,
  correlationId?: string,
  options?: { customerIdContext?: string }
): CollectEventResult {
  const trimmed = orderId.trim();
  if (!trimmed) return { ok: false, errorCode: "MISSING_ORDER_ID" };

  const resolvedId = resolveOrderEngineOrderId(trimmed);
  if (!resolvedId) {
    return { ok: false, errorCode: "ORDER_NOT_FOUND" };
  }

  return ingestStorefrontPurchaseSignalResolved(
    trimmed,
    correlationId ?? trimmed,
    options?.customerIdContext
  );
}
