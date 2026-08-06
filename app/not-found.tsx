import Link from "next/link";

export default function NotFound() {
  return (
    <section className="error-page">
      <h1>404</h1>
      <h2>Seite nicht gefunden</h2>
      <p>Die angeforderte Seite existiert nicht oder wurde verschoben.</p>
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
