"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";
import { getProductById } from "@/lib/products";
import { localizePublicProduct } from "@/lib/products/i18n";
import { useCart } from "@/lib/cart";
import { useLocale } from "@/lib/i18n/context";
import ProductSvg from "./ProductSvg";
import PriceLabel from "@/components/shop/PriceLabel";
import { showPrices } from "@/lib/shop/mode";

export default function WishlistView() {
  const { ids, toggle } = useWishlist();
  const { add } = useCart();
  const { locale, t } = useLocale();

  if (ids.length === 0) {
    return (
      <div className="shop-empty">
        <h1>{t("wishlistPage.title")}</h1>
        <p>{t("wishlistPage.empty")}</p>
        <Link href="/products/" className="shop-btn-primary">{t("wishlistPage.discover")}</Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1 className="shop-page-title">{t("wishlistPage.title")}</h1>
      <ul className="wishlist-items">
        {ids.map((id) => {
          const product = getProductById(id);
          if (!product) return null;
          const localized = localizePublicProduct(product, locale);
          return (
            <li key={id} className="wishlist-item">
              <Link href={localized.url} className="wishlist-item-img">
                <ProductSvg imageKey={localized.imageKey ?? "oel"} />
              </Link>
              <div className="wishlist-item-body">
                <Link href={localized.url}>{localized.name}</Link>
                {showPrices() ? <PriceLabel amount={localized.price} /> : null}
              </div>
              <div className="wishlist-item-actions">
                <button type="button" className="shop-btn-primary" onClick={() => add({ productId: product.id })}>
                  {t("product.addToCart")}
                </button>
                <button type="button" className="cart-remove" onClick={() => toggle(id)}>
                  {t("cart.remove")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
