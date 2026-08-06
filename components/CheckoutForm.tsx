"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice, getShippingCost } from "@/lib/products";
import {
  LIMITS,
  clampText,
  isSafeName,
  isValidEmail,
  isValidGermanZip,
} from "@/lib/security";
import type { CheckoutData } from "@/types";

const ORDER_STORAGE_KEY = "buzzard_last_order";

export default function CheckoutForm() {
  const router = useRouter();
  const { items, total, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <div className="shop-empty">
        <h1>Keine Artikel zur Kasse</h1>
        <p>Ihr Warenkorb ist leer.</p>
      </div>
    );
  }

  const shipping = getShippingCost(total);
  const grandTotal = total + shipping;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data: CheckoutData = {
      name: clampText((form.elements.namedItem("name") as HTMLInputElement).value, LIMITS.name),
      email: clampText((form.elements.namedItem("email") as HTMLInputElement).value, LIMITS.email).toLowerCase(),
      street: clampText((form.elements.namedItem("street") as HTMLInputElement).value, LIMITS.street),
      zip: clampText((form.elements.namedItem("zip") as HTMLInputElement).value, LIMITS.zip),
      city: clampText((form.elements.namedItem("city") as HTMLInputElement).value, LIMITS.city),
      payment: (form.elements.namedItem("payment") as HTMLSelectElement).value as CheckoutData["payment"],
    };

    if (!data.name || !data.email || !data.street || !data.zip || !data.city) {
      setError("Bitte alle Pflichtfelder ausfüllen.");
      setLoading(false);
      return;
    }

    if (!isSafeName(data.name)) {
      setError("Bitte geben Sie einen gültigen Namen ein.");
      setLoading(false);
      return;
    }

    if (!isValidEmail(data.email)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      setLoading(false);
      return;
    }

    if (!isValidGermanZip(data.zip)) {
      setError("Bitte geben Sie eine gültige deutsche PLZ (5 Ziffern) ein.");
      setLoading(false);
      return;
    }

    if (!["paypal", "card", "invoice"].includes(data.payment)) {
      setError("Ungültige Zahlungsmethode.");
      setLoading(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 800));

    const order = {
      id: `BZ-${Date.now()}`,
      date: new Date().toISOString(),
      items,
      total: grandTotal,
      customer: data,
    };

    try {
      sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
      localStorage.removeItem(ORDER_STORAGE_KEY);
    } catch {
      setError("Speichern der Bestellung fehlgeschlagen. Bitte erneut versuchen.");
      setLoading(false);
      return;
    }

    clear();
    router.push("/checkout/erfolg/");
  }

  return (
    <div className="checkout-page">
      <h1 className="shop-page-title">Kasse</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
          <h2>Lieferadresse</h2>
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" required autoComplete="name" maxLength={LIMITS.name} />

          <label htmlFor="email">E-Mail *</label>
          <input id="email" name="email" type="email" required autoComplete="email" maxLength={LIMITS.email} />

          <label htmlFor="street">Straße & Hausnummer *</label>
          <input id="street" name="street" required autoComplete="street-address" maxLength={LIMITS.street} />

          <div className="checkout-row">
            <div>
              <label htmlFor="zip">PLZ *</label>
              <input id="zip" name="zip" required autoComplete="postal-code" inputMode="numeric" pattern="\d{5}" maxLength={5} />
            </div>
            <div>
              <label htmlFor="city">Stadt *</label>
              <input id="city" name="city" required autoComplete="address-level2" maxLength={LIMITS.city} />
            </div>
          </div>

          <h2>Zahlungsart</h2>
          <label htmlFor="payment">Zahlungsmethode</label>
          <select id="payment" name="payment" defaultValue="paypal">
            <option value="paypal">PayPal</option>
            <option value="card">Kreditkarte</option>
            <option value="invoice">Rechnung (B2B)</option>
          </select>

          {error && <p className="shop-modal-error">{error}</p>}

          <button type="submit" className="shop-btn-primary" disabled={loading}>
            {loading ? "Bestellung wird verarbeitet…" : `Jetzt kaufen – ${formatPrice(grandTotal)}`}
          </button>
        </form>

        <aside className="cart-summary">
          <h2>Ihre Bestellung</h2>
          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.qty}× {item.name}</span>
                <span>{formatPrice(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-summary-row">
            <span>Versand</span>
            <span>{shipping === 0 ? "Kostenlos" : formatPrice(shipping)}</span>
          </div>
          <div className="cart-summary-row cart-summary-total">
            <span>Gesamt</span>
            <span>{formatPrice(grandTotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
