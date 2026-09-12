export interface CommerceOrderEngineMapping {
  commerceOrderId: string;
  orderEngineOrderId: string;
  customerId?: string;
  marketId: string;
  currency: string;
  syncedAt: string;
}

const mappingsByCommerceId = new Map<string, CommerceOrderEngineMapping>();
const mappingsByEngineId = new Map<string, CommerceOrderEngineMapping>();

export function getCommerceOrderMapping(commerceOrderId: string): CommerceOrderEngineMapping | undefined {
  return mappingsByCommerceId.get(commerceOrderId);
}

export function getCommerceMappingByEngineOrderId(orderEngineOrderId: string): CommerceOrderEngineMapping | undefined {
  return mappingsByEngineId.get(orderEngineOrderId);
}

export function saveCommerceOrderMapping(mapping: CommerceOrderEngineMapping): void {
  mappingsByCommerceId.set(mapping.commerceOrderId, mapping);
  mappingsByEngineId.set(mapping.orderEngineOrderId, mapping);
}

export function clearCommerceOrderMappings(): void {
  mappingsByCommerceId.clear();
  mappingsByEngineId.clear();
}

export function listCommerceOrderMappings(): CommerceOrderEngineMapping[] {
  return [...mappingsByCommerceId.values()];
}
