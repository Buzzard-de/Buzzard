export const marketingConfig = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID || "",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
  merchantCenterId: process.env.NEXT_PUBLIC_MERCHANT_CENTER_ID || "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
  searchConsoleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
};

export function marketingEnabled(): boolean {
  return Boolean(
    marketingConfig.ga4Id ||
      marketingConfig.gtmId ||
      marketingConfig.metaPixelId ||
      marketingConfig.tiktokPixelId
  );
}
