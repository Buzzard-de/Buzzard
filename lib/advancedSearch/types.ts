export interface SearchOverview {
  products: number;
  searches: number;
  zeroResults: number;
  clicks: number;
  synonyms: number;
  topQueries: Array<{ normalized_query: string; n: number }>;
}

export interface ZeroResultRow {
  normalized_query: string;
  n: number;
}

export interface SearchProductRow {
  id: number;
  sku: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  currency: string;
  rating: number;
  review_count: number;
  stock: number;
  tags: string;
  attributes_json: string;
  active: number;
  rank_score?: number;
}

export interface AdvancedSearchStatus {
  version: string;
  enabled: boolean;
  totals: {
    products: number;
    searches: number;
    zeroResults: number;
    clicks: number;
    synonyms: number;
    topQueries: number;
  };
  overview: SearchOverview;
}
