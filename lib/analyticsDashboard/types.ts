export interface AnalyticsDashboardStatus {
  version: string;
  enabled: boolean;
  totals: {
    orders: number;
    events: number;
    customers: number;
  };
}

export interface AnalyticsSummary {
  revenue: number;
  estimatedGrossProfit: number;
  orders: number;
  aov: number;
  countries: number;
  sessions: number;
  purchases: number;
  conversionRate: number;
}

export interface AnalyticsDailyPoint {
  day: string;
  revenue: number;
  orders: number;
  gross_profit: number;
}

export interface AnalyticsCountryRow {
  country: string;
  orders: number;
  revenue: number;
  gross_profit: number;
}

export interface AnalyticsCategoryRow {
  category: string;
  orders: number;
  revenue: number;
  gross_profit: number;
}

export interface AnalyticsProductRow {
  sku: string;
  name: string;
  orders: number;
  revenue: number;
  gross_profit: number;
}

export interface AnalyticsSourceRow {
  source: string;
  purchases: number;
  revenue: number;
  gross_profit: number;
}

export interface AnalyticsFunnel {
  pageViews: number;
  productViews: number;
  addToCart: number;
  checkoutStarts: number;
  purchases: number;
  productRate: number;
  cartRate: number;
  checkoutRate: number;
  purchaseRate: number;
}
