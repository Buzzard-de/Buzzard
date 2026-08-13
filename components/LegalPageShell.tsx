import Link from "next/link";

interface LegalPageShellProps {
  title: string;
  description: string;
  breadcrumb: string;
  children: React.ReactNode;
}

export function LegalPageShell({ title, description, breadcrumb, children }: LegalPageShellProps) {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link> <span>/</span> <span>{breadcrumb}</span>
          </nav>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <div className="subpage-content">{children}</div>
    </>
  );
}

export function legalStubNotice() {
  return (
    <p className="legal-stub-notice">
      <strong>Hinweis:</strong> Diese Seite ist für den Katalogmodus vorbereitet. Inhalte zu Versand, Widerruf und
      Verkauf werden vor dem Go-Live final ergänzt.
    </p>
  );
}
