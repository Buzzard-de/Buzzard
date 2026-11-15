export type KpiSection =
  | "executive"
  | "funnel"
  | "products"
  | "categories"
  | "markets"
  | "channels"
  | "traffic"
  | "returns"
  | "profitability";

type DeviceType = "DESKTOP" | "MOBILE" | "TABLET" | "OTHER";
type TrafficSourceType =
  | "DIRECT"
  | "ORGANIC_SEARCH"
  | "PAID_SEARCH"
  | "SOCIAL"
  | "EMAIL"
  | "REFERRAL"
  | "MARKETPLACE"
  | "OTHER";

export type KpiDateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "current_month"
  | "previous_month"
  | "custom";

export interface KpiQueryInput {
  range?: KpiDateRangePreset;
  from?: string;
  to?: string;
  comparePrevious?: boolean;
  limit?: number;
  now?: Date;
}

export interface ResolvedDateRange {
  preset: KpiDateRangePreset;
  from: string;
  to: string;
  previousFrom?: string;
  previousTo?: string;
}

export interface PeriodDelta {
  absolute: number;
  percent: number | null;
  points: number | null;
}

export interface ExecutiveKpis {
  orders: number;
  grossRevenueCents: number;
  authoritativeRevenueCents: number;
  averageOrderValueCents: number;
  unitsSold: number;
  revenuePerSessionCents: number;
  visitors: number;
  sessions: number;
  productViews: number;
  addToCart: number;
  checkoutStarts: number;
  checkoutCompletions: number;
  purchases: number;
  conversionRate: number;
  addToCartRate: number;
  checkoutCompletionRate: number;
  returnRequests: number;
  returnedOrders: number;
  refundAmountCents: number;
  returnRate: number;
  refundRate: number;
  netRevenueCents: number;
}

export interface FunnelStepKpi {
  stage: string;
  count: number;
  conversionFromPrevious: number;
  dropOffFromPrevious: number;
}

export interface FunnelKpis {
  steps: FunnelStepKpi[];
  visitorToPurchase: number;
  sessionToPurchase: number;
}

export interface ProductKpiRow {
  productId: string;
  productName: string;
  categoryId?: string;
  views: number;
  addToCart: number;
  cartConversion: number;
  checkoutCount: number;
  purchases: number;
  unitsSold: number;
  revenueCents: number;
  refunds: number;
  returnRate: number;
  netRevenueCents: number;
  contributionCents: number;
  contributionMarginPercent: number;
}

export interface CategoryKpiRow {
  categoryId: string;
  views: number;
  addToCart: number;
  purchases: number;
  unitsSold: number;
  revenueCents: number;
  conversionRate: number;
  returnRate: number;
  netRevenueCents: number;
}

export interface MarketKpiRow {
  market: string;
  country: string;
  currency: string;
  orders: number;
  revenueCents: number;
  netRevenueCents: number;
  conversionRate: number;
  averageOrderValueCents: number;
  returns: number;
  returnRate: number;
  contributionCents: number;
  contributionMarginPercent: number;
}

export interface LanguageKpiRow {
  language: string;
  visitors: number;
  sessions: number;
  productViews: number;
  addToCart: number;
  purchases: number;
  revenueCents: number;
  conversionRate: number;
}

export interface CommerceChannelKpiRow {
  channel: string;
  orders: number;
  revenueCents: number;
  averageOrderValueCents: number;
  returns: number;
  netRevenueCents: number;
  contributionCents: number;
  contributionMarginPercent: number;
}

export interface TrafficSourceKpiRow {
  source: TrafficSourceType;
  sessions: number;
  productViews: number;
  addToCart: number;
  checkoutStarts: number;
  purchases: number;
  revenueCents: number;
  conversionRate: number;
}

export interface DeviceKpiRow {
  device: DeviceType;
  sessions: number;
  productViews: number;
  addToCart: number;
  checkoutStarts: number;
  purchases: number;
  revenueCents: number;
  conversionRate: number;
}

export interface CustomerKpis {
  newVisitors: number;
  returningVisitors: number;
  sessionsPerVisitor: number;
  purchasesPerVisitor: number;
  revenuePerVisitorCents: number;
}

export interface CohortKpiRow {
  cohortPeriod: string;
  firstTimeVisitors: number;
  returningSessions: number;
  repeatPurchases: number;
  revenueCents: number;
}

export interface ReturnKpis {
  returnRequests: number;
  returnedOrders: number;
  refundAmountCents: number;
  returnRate: number;
  refundRate: number;
  netRevenueAfterReturnsCents: number;
  byProduct: Array<{ productId: string; returnRate: number; refundImpactCents: number }>;
  byCategory: Array<{ categoryId: string; returnRate: number }>;
  byMarket: Array<{ market: string; returnRate: number }>;
  byChannel: Array<{ channel: string; refundRate: number }>;
}

export interface ProfitabilityKpis {
  grossRevenueCents: number;
  productCostCents: number;
  shippingCostCents: number;
  marketplaceFeesCents: number;
  paymentFeesCents: number;
  returnRefundImpactCents: number;
  contributionCents: number;
  contributionMarginPercent: number;
  authoritativeOnly: true;
}

export interface RankingRow {
  key: string;
  label: string;
  value: number;
  secondary?: number;
}

export interface BusinessKpiDashboard {
  range: ResolvedDateRange;
  executive: ExecutiveKpis;
  previousExecutive?: Partial<ExecutiveKpis>;
  deltas?: Partial<Record<keyof ExecutiveKpis, PeriodDelta>>;
  funnel: FunnelKpis;
  products: ProductKpiRow[];
  categories: CategoryKpiRow[];
  markets: MarketKpiRow[];
  languages: LanguageKpiRow[];
  channels: CommerceChannelKpiRow[];
  traffic: TrafficSourceKpiRow[];
  devices: DeviceKpiRow[];
  customers: CustomerKpis;
  cohorts: CohortKpiRow[];
  returns: ReturnKpis;
  profitability: ProfitabilityKpis;
  rankings: {
    productsByRevenue: RankingRow[];
    productsByUnits: RankingRow[];
    productsByConversion: RankingRow[];
    productsByMargin: RankingRow[];
    categoriesByRevenue: RankingRow[];
    marketsByRevenue: RankingRow[];
    channelsByRevenue: RankingRow[];
  };
}
