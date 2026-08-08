"use client";

import { AccountProvider } from "@/lib/account/context";
import { CartProvider } from "@/lib/cart";
import { HomeUIProvider } from "@/lib/home-ui";
import { LocaleProvider } from "@/lib/i18n/context";
import { ShopProvider } from "@/lib/shop";
import { WishlistProvider } from "@/lib/wishlist";
import MegaMenuOverlay from "./MegaMenuOverlay";
import ShopModals from "./ShopModals";
import LocaleHead from "./LocaleHead";
import GlobalStructuredData from "./seo/GlobalStructuredData";
import ConsentBanner from "./marketing/ConsentBanner";
import MarketingScripts from "./marketing/MarketingScripts";
import PageViewTracker from "./marketing/PageViewTracker";

export default function ShopProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AccountProvider>
        <CartProvider>
          <WishlistProvider>
            <ShopProvider>
              <HomeUIProvider>
              <GlobalStructuredData />
              {children}
              <LocaleHead />
              <PageViewTracker />
              <ConsentBanner />
              <MarketingScripts />
              <MegaMenuOverlay />
                <ShopModals />
              </HomeUIProvider>
            </ShopProvider>
          </WishlistProvider>
        </CartProvider>
      </AccountProvider>
    </LocaleProvider>
  );
}
