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

export function catalogModeNotice() {
  return (
    <p className="legal-catalog-notice">
      <strong>Katalogmodus:</strong> Buzzard24 ist ein reiner Produktkatalog. Online-Bestellungen und Versand sind
      derzeit nicht aktiv. Für Anfragen nutzen Sie bitte unser{" "}
      <Link href="/impressum/">Kontaktformular</Link> oder rufen Sie uns an.
    </p>
  );
}

/** @deprecated Use catalogModeNotice */
export const legalStubNotice = catalogModeNotice;
