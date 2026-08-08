"use client";

import { CartProvider } from "@/lib/cart";
import { HomeUIProvider } from "@/lib/home-ui";
import { LocaleProvider } from "@/lib/i18n/context";
import { ShopProvider } from "@/lib/shop";
import { WishlistProvider } from "@/lib/wishlist";
import MegaMenuOverlay from "./MegaMenuOverlay";
import ShopModals from "./ShopModals";

export default function ShopProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <CartProvider>
        <WishlistProvider>
          <ShopProvider>
            <HomeUIProvider>
              {children}
              <MegaMenuOverlay />
              <ShopModals />
            </HomeUIProvider>
          </ShopProvider>
        </WishlistProvider>
      </CartProvider>
    </LocaleProvider>
  );
}
