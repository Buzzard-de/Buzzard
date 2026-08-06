"use client";

import Link from "next/link";

export default function AccountPage() {
  return (
    <section className="shop-page">
      <div className="shop-empty account-page">
        <h1>Mein Konto</h1>
        <p>Die Konto-Anmeldung ist in dieser Demo noch nicht verfügbar.</p>
        <p>Sie können bestellen, ohne ein Konto zu erstellen.</p>
        <div className="checkout-success-actions">
          <Link href="/warenkorb/" className="shop-btn-primary">Zum Warenkorb</Link>
          <Link href="/products/" className="shop-btn-secondary">Produkte ansehen</Link>
        </div>
      </div>
    </section>
  );
}
