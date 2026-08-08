export type AnalyticsRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "month_to_date"
  | "previous_month"
  | "year_to_date"
  | "custom";

export interface AnalyticsRange {
  preset: AnalyticsRangePreset;
  start: string;
  end: string;
  timezone: string;
}

export interface AnalyticsKpis {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  unitsSold: number;
  newCustomers: number;
  conversionRate: number | null;
  refunds: number;
  shippingRevenue: number;
  estimatedGrossProfit: number | null;
  stockAlerts: number;
  lowStock: number;
  outOfStock: number;
  discounts: number;
}

export interface AnalyticsOverview {
  range: AnalyticsRange;
  kpis: AnalyticsKpis;
  notes: Record<string, string>;
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface SalesAnalytics {
  range: AnalyticsRange;
  trend: SalesTrendPoint[];
  topProducts: Array<{ productId: string; name: string; revenue: number; units: number }>;
  topBrands: Array<{ brand: string; revenue: number }>;
  salesByCountry: Array<{ country: string; revenue: number }>;
  totals: {
    revenue: number;
    orders: number;
    unitsSold: number;
    averageOrderValue: number;
  };
}

export interface ProductAnalytics {
  range: AnalyticsRange;
  bestSellers: Array<{ productId: string; name: string; sku?: string; revenue: number; units: number; stock?: number; stockStatus?: string }>;
  slowMovers: Array<{ productId: string; name: string; sku?: string; stock?: number; stockStatus?: string }>;
  lowStock: Array<{ productId: string; name: string; sku?: string; stock?: number }>;
  outOfStock: Array<{ productId: string; name: string; sku?: string; stock?: number }>;
  highReturns: Array<{ productId: string; name: string; sku?: string; returns: number; revenue: number; units: number }>;
  lowStockThreshold: number;
}

export interface CategoryAnalytics {
  range: AnalyticsRange;
  categoryId: string | null;
  categories: Array<{ categoryId: string; name: string; revenue: number; units: number; orders: number }>;
}

export interface CustomerAnalytics {
  range: AnalyticsRange;
  newCustomers: number;
  returningCustomers: number;
  averageCustomerValue: number;
  geographicDistribution: Array<{ country: string; orders: number }>;
  topCustomers: Array<{ email: string; total: number }>;
  accountCreationTrend: Array<{ date: string; count: number }>;
}

export interface InventoryAnalytics {
  totals: {
    activeProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  lowStockThreshold: number;
  syncErrors: number;
  recentSyncFailures: unknown[];
}

export interface SupplierAnalyticsRow {
  supplierId: string;
  orders: number;
  failed: number;
  confirmed: number;
  successRate: number;
  fulfillmentFailures: number;
}

export interface FinanceAnalytics {
  range: AnalyticsRange;
  grossSales: number;
  discounts: number;
  refunds: number;
  refundCount: number;
  shippingRevenue: number;
  estimatedShippingCost: number;
  supplierCost: number;
  estimatedGrossProfit: number;
  estimatedContributionMargin: number;
  disclaimer: string;
}
