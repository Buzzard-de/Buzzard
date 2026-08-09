export interface IntegrationGroup {
  [name: string]: boolean;
}

export interface CommercialIntegrationStatus {
  version?: string;
  payments: IntegrationGroup;
  carriers: IntegrationGroup;
  tax: boolean;
  fx: boolean;
  supplier: boolean;
  tecdoc: boolean;
  webhooks?: {
    note?: string;
    configured?: boolean;
  };
}

export interface TaxQuote {
  countryCode: string;
  rate: number | null;
  tax: number | null;
  source: string;
  status?: string;
}

export interface FxRate {
  from: string;
  to: string;
  rate: number | null;
  source: string;
}

export interface TecDocCompatibility {
  productSku?: string;
  vehicle?: unknown;
  compatible: boolean | null;
  status: string;
}
