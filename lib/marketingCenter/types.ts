export interface MarketingProvider {
  provider: string;
  enabled: number;
  account_label: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: number;
  name: string;
  channel: string;
  objective: string;
  status: string;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  coupon_code: string;
  created_at: string;
  spend: number;
  revenue: number;
  orders: number;
  roas: number | null;
  profit_before_ad_spend: number;
}

export interface MarketingSummary {
  spend: number;
  revenue: number;
  orders: number;
  campaigns: number;
  roas: number | null;
  net_after_ad_spend: number;
}

export interface MarketingChannelRow {
  channel: string;
  spend: number;
  revenue: number;
  orders: number;
  roas: number | null;
}

export interface MarketingUtmRow {
  source: string;
  medium: string;
  campaign: string;
  events: number;
}

export interface MarketingCenterStatus {
  version: string;
  enabled: boolean;
  providers: number;
  totals: {
    campaigns: number;
    events: number;
    conversions: number;
  };
}

export interface CreateCampaignInput {
  name: string;
  channel: string;
  objective?: string;
  status?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  couponCode?: string;
}
