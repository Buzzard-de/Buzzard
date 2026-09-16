import { AsyncLocalStorage } from "async_hooks";

export interface ScopedFirstProductionOrderContext {
  executionId: string;
  authorizationId: string;
  supplierId: string;
}

const scopedContext = new AsyncLocalStorage<ScopedFirstProductionOrderContext>();

export function isInScopedFirstProductionOrderContext(): boolean {
  return scopedContext.getStore() !== undefined;
}

export function getScopedFirstProductionOrderContext(): ScopedFirstProductionOrderContext | undefined {
  return scopedContext.getStore();
}

export function withScopedFirstProductionOrderNetwork<T>(
  context: ScopedFirstProductionOrderContext,
  fn: () => Promise<T>,
): Promise<T> {
  return scopedContext.run(context, fn);
}

export function isScopedFirstProductionOrderNetworkEnabled(): boolean {
  const raw = process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_NETWORK;
  return raw === "1" || raw?.toLowerCase() === "true";
}

export function canUseScopedFirstProductionOrderNetwork(): boolean {
  return isScopedFirstProductionOrderNetworkEnabled() && isInScopedFirstProductionOrderContext();
}
