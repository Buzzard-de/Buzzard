export type LocalizationLocale = {
  code: string;
  name: string;
  currency: string;
  country_code: string;
  active?: number;
};

export type LocalizationCountryConfig = {
  country: string;
  locale: LocalizationLocale | null;
  taxRate: number | null;
  shipping: Array<{
    country_code: string;
    method: string;
    price: number;
    free_from: number;
  }>;
};

export type LocalizedCatalogProduct = {
  id: number;
  sku: string;
  name: string;
  description: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  category?: string;
  category_slug?: string;
  price_eur: number;
  price: number;
  currency: string;
  country: string;
  locale: string;
  stock: number;
  image_url: string;
  active: boolean;
  images?: Array<{
    id: number;
    product_id: number;
    url: string;
    alt_text: string;
    sort_order: number;
  }>;
};

export type LocalizationFeedsStatus = {
  version: string;
  enabled: boolean;
  localeCount?: number;
  locales?: LocalizationLocale[];
  totals: {
    translations: number;
    priceOverrides: number;
    taxRates?: number;
    shippingRates?: number;
  };
  taxRates?: Array<{ country_code: string; rate: number }>;
};
