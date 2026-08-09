export interface MarketingLoyaltyOverview {
  campaigns: number;
  activeCampaigns: number;
  promotionUses: number;
  loyaltyCustomers: number;
  loyaltyPoints: number;
  referrals: number;
  completedReferrals: number;
}

export interface MarketingCampaignRow {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  audience_segment: string;
  discount_type: string;
  discount_value: number;
  minimum_order: number;
  max_uses: number;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  channel: string;
  created_at: string;
}

export interface MarketingLoyaltyStatus {
  version: string;
  enabled: boolean;
  totals: {
    campaigns: number;
    activeCampaigns: number;
    promotionUses: number;
    loyaltyCustomers: number;
    loyaltyPoints: number;
    referrals: number;
    completedReferrals: number;
    tiers: number;
  };
  overview: MarketingLoyaltyOverview;
}
