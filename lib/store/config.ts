import { apiBaseUrl, isApiConfigured, isSqliteStoreEnabled } from "@/lib/api/config";

export { isSqliteStoreEnabled };

export function storeApiBase(): string {
  return apiBaseUrl();
}

export function isStoreApiConfigured(): boolean {
  return isSqliteStoreEnabled() && isApiConfigured();
}
