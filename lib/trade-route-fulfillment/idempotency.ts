import type { TradeRouteFulfillmentSnapshot } from "./types";

const pipelineCache = new Map<string, TradeRouteFulfillmentSnapshot>();

export function pipelineCacheKey(orderId: string, idempotencyKey: string): string {
  return `${orderId}:${idempotencyKey}:trade-route-pipeline`;
}

export function getCachedPipelineSnapshot(
  orderId: string,
  idempotencyKey: string,
): TradeRouteFulfillmentSnapshot | undefined {
  return pipelineCache.get(pipelineCacheKey(orderId, idempotencyKey));
}

export function cachePipelineSnapshot(
  orderId: string,
  idempotencyKey: string,
  snapshot: TradeRouteFulfillmentSnapshot,
): void {
  pipelineCache.set(pipelineCacheKey(orderId, idempotencyKey), snapshot);
}

export function clearTradeRoutePipelineCache(): void {
  pipelineCache.clear();
}
