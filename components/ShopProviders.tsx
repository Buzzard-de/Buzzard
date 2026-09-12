"use client";

import { AccountProvider } from "@/lib/account/context";
import { CartProvider } from "@/lib/cart";
import { HomeUIProvider } from "@/lib/home-ui";
import { LocaleProvider } from "@/lib/i18n/context";
import { MarketProvider } from "@/lib/market/context";
import { BuzzardMarketProvider } from "@/lib/market-engine/context";
import { GlobalLocaleProvider } from "@/lib/global/context";
import { ShopProvider } from "@/lib/shop";
import { WishlistProvider } from "@/lib/wishlist";
import MegaMenuOverlay from "./MegaMenuOverlay";
import ShopModals from "./ShopModals";
import LocaleHead from "./LocaleHead";
import GlobalStructuredData from "./seo/GlobalStructuredData";
import ConsentBanner from "./marketing/ConsentBanner";
import MarketingScripts from "./marketing/MarketingScripts";
import PageViewTracker from "./marketing/PageViewTracker";
import StorefrontAnalyticsProvider from "./analytics/StorefrontAnalyticsProvider";
import AiChatWidget from "./ai/AiChatWidget";
import StorefrontApiBanner from "./StorefrontApiBanner";

export default function ShopProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <MarketProvider>
      <BuzzardMarketProvider>
      <GlobalLocaleProvider>
      <AccountProvider>
        <CartProvider>
          <WishlistProvider>
            <ShopProvider>
              <HomeUIProvider>
              <GlobalStructuredData />
              <StorefrontApiBanner />
              {children}
              <LocaleHead />
              <StorefrontAnalyticsProvider>
              <PageViewTracker />
              </StorefrontAnalyticsProvider>
              <ConsentBanner />
              <AiChatWidget />
              <MarketingScripts />
              <MegaMenuOverlay />
                <ShopModals />
              </HomeUIProvider>
            </ShopProvider>
          </WishlistProvider>
        </CartProvider>
      </AccountProvider>
      </GlobalLocaleProvider>
      </BuzzardMarketProvider>
      </MarketProvider>
    </LocaleProvider>
  );
}
