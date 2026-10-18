import Link from "next/link";

export default function ProductNotFound() {
  return (
    <section className="error-page" data-product-missing="true">
      <h1>404</h1>
      <h2>Produkt nicht gefunden</h2>
      <p>Dieser Artikel ist nicht im statischen Katalog oder ist nicht verfügbar.</p>
      <div className="error-page-btns">
        <Link href="/" className="btn-primary">
          Zur Startseite
        </Link>
        <Link href="/products/" className="btn-secondary">
          Produkte ansehen
        </Link>
      </div>
    </section>
  );
}
