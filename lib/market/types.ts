import type { BuzzardLocale } from "@/lib/i18n/types";

export interface MarketCountry {
  code: string;
  name: string;
  flag: string;
  language: BuzzardLocale | string;
  languageName: string;
  currency: string;
  locale: string;
  taxModel: string;
  taxRate: number;
  deliveryDays: string;
  rtl: boolean;
}

export interface ShippingRateTier {
  maxKg: number;
  price: number;
}

export interface CountryShippingRules {
  freeShippingFrom: number;
  rates: ShippingRateTier[];
}

export type ShippingRulesMap = Record<string, CountryShippingRules>;
