import type { IntegrationType, SupplierCapabilities, SupplierFieldMapping } from "../types";
import type { SupplierAuthType, SupplierConnectorEnvironment } from "../network/types";

export interface LiveSupplierEndpoints {
  health?: string;
  products?: string;
  stock?: string;
  prices?: string;
}

export interface LiveSupplierProfile {
  supplierId: string;
  name: string;
  displayName?: string;
  country: string;
  region: string;
  currency: string;
  connectorType: IntegrationType;
  adapterProfile?: "generic" | "inter-cars";
  environment: SupplierConnectorEnvironment;
  baseUrl: string;
  secretsRef: string;
  authentication: "api_key" | "bearer" | "basic" | "oauth2" | "token" | "custom" | "none";
  authType?: SupplierAuthType;
  endpoints: LiveSupplierEndpoints;
  fieldMapping: SupplierFieldMapping;
  categoryMapping?: Record<string, string>;
  categoryMappingRef?: string;
  supportedMarkets: string[];
  capabilities: SupplierCapabilities;
  pagination?: {
    mode?: "page" | "offset" | "cursor" | "nextPageToken" | "linkHeader" | "pageNumber";
    pageSize?: number;
    pageParam?: string;
    pageSizeParam?: string;
    hasNextPageField?: string;
    cursorField?: string;
  };
  feedFormat?: "json" | "xml";
  priceIncludesVat?: boolean;
  priceModel?: "net" | "gross";
  priceField?: string;
  dropshipping?: boolean;
  whiteLabel?: boolean;
  blindShipping?: boolean;
  allowedEndpoints?: string[];
  requestHeaders?: Record<string, string>;
}
