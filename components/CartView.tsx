"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import {
  FREE_SHIPPING_THRESHOLD,
  formatPrice,
  getShippingCost,
} from "@/lib/products";
import ProductSvg from "./ProductSvg";
import { getProductById } from "@/lib/products";

export default function CartView() {
  const { items, total, remove, updateQty } = useCart();

  if (items.length === 0) {
    return (
      <div className="shop-empty">
        <h1>Ihr Warenkorb ist leer</h1>
        <p>Stöbern Sie in unserem Katalog und legen Sie Produkte in den Warenkorb.</p>
        <Link href="/products/" className="shop-btn-primary">Zum Shop</Link>
      </div>
    );
  }

  const shipping = getShippingCost(total);
  const grandTotal = total + shipping;
  const untilFree = FREE_SHIPPING_THRESHOLD - total;

  return (
    <div className="cart-page">
      <h1 className="shop-page-title">Warenkorb</h1>

      {untilFree > 0 && (
        <p className="cart-shipping-hint">
          Noch {formatPrice(untilFree)} bis zum kostenlosen Versand ab {formatPrice(FREE_SHIPPING_THRESHOLD)}
        </p>
      )}

      <div className="cart-layout">
        <ul className="cart-items">
          {items.map((item) => {
            const product = getProductById(item.id);
            return (
              <li key={item.id} className="cart-item">
                <Link href={`/products/${item.id}/`} className="cart-item-img">
                  <ProductSvg imageKey={product?.imageKey || "default"} />
                </Link>
                <div className="cart-item-body">
                  <Link href={`/products/${item.id}/`} className="cart-item-name">{item.name}</Link>
                  <span className="cart-item-price">{formatPrice(item.price)}</span>
                  <div className="cart-item-actions">
                    <div className="qty-control">
                      <button type="button" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Menge reduzieren">−</button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Menge erhöhen">+</button>
                    </div>
                    <button type="button" className="cart-remove" onClick={() => remove(item.id)}>Entfernen</button>
                  </div>
                </div>
                <strong className="cart-item-total">{formatPrice(item.price * item.qty)}</strong>
              </li>
            );
          })}
        </ul>

        <aside className="cart-summary">
          <h2>Bestellübersicht</h2>
          <div className="cart-summary-row">
            <span>Zwischensumme</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Versand</span>
            <span>{shipping === 0 ? "Kostenlos" : formatPrice(shipping)}</span>
          </div>
          <div className="cart-summary-row cart-summary-total">
            <span>Gesamt</span>
            <span>{formatPrice(grandTotal)}</span>
          </div>
          <Link href="/checkout/" className="shop-btn-primary cart-checkout-btn">
            Zur Kasse
          </Link>
          <Link href="/products/" className="shop-btn-secondary">Weiter einkaufen</Link>
        </aside>
      </div>
    </div>
  );
}
