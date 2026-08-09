export interface CrmLoyaltyStatus {
  version: string;
  enabled: boolean;
  totals: {
    crmProfiles: number;
    loyaltyAccounts: number;
    rewards: number;
    segments: number;
    offers: number;
    abandonedCarts: number;
    recoveryCampaigns: number;
  };
}

export interface CrmProfile {
  user_id: number;
  phone?: string;
  country_code?: string;
  language?: string;
  marketing_email?: number;
  marketing_sms?: number;
  marketing_whatsapp?: number;
}

export interface LoyaltyAccount {
  user_id?: number;
  points: number;
  lifetime_points: number;
  tier: string;
}

export interface LoyaltyLedgerEntry {
  id: number;
  user_id: number;
  points: number;
  reason?: string;
  reference?: string;
  created_at: string;
}

export interface LoyaltyReward {
  id: number;
  code: string;
  title: string;
  points_cost: number;
  discount_type: string;
  discount_value: number;
  active: number;
}

export interface CustomerOffer {
  id: number;
  user_id: number;
  title: string;
  code: string;
  discount_type: string;
  discount_value: number;
  status: string;
  expires_at?: string | null;
  created_at: string;
}

export interface CustomerSegment {
  id: number;
  name: string;
  description: string;
  rules_json: string;
}

export interface AbandonedCartRecord {
  id: number;
  user_id: number;
  cart_key: string;
  subtotal: number;
  currency: string;
  item_count: number;
  status: string;
  last_seen_at: string;
  recovered_at?: string | null;
}
