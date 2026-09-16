import { AsyncLocalStorage } from "async_hooks";

export interface ScopedValidationNetworkContext {
  runId: string;
  validationId: string;
  supplierId: string;
}

const scopedContext = new AsyncLocalStorage<ScopedValidationNetworkContext>();

export function isInScopedValidationNetworkContext(): boolean {
  return scopedContext.getStore() !== undefined;
}

export function getScopedValidationNetworkContext(): ScopedValidationNetworkContext | undefined {
  return scopedContext.getStore();
}

export function withScopedValidationNetwork<T>(
  context: ScopedValidationNetworkContext,
  fn: () => Promise<T>,
): Promise<T> {
  return scopedContext.run(context, fn);
}

export function isScopedValidationNetworkEnabled(): boolean {
  const raw = process.env.SUPPLIER_CONTROLLED_VALIDATION_NETWORK;
  return raw === "1" || raw?.toLowerCase() === "true";
}

export function canUseScopedValidationNetwork(): boolean {
  return isScopedValidationNetworkEnabled() && isInScopedValidationNetworkContext();
}
