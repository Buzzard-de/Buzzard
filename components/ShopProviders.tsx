"use client";

import { CartProvider } from "@/lib/cart";
import { ShopProvider } from "@/lib/shop";
import { WishlistProvider } from "@/lib/wishlist";
import ShopModals from "./ShopModals";

export default function ShopProviders({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <ShopProvider>
          {children}
          <ShopModals />
        </ShopProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
