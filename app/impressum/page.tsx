import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum – Buzzard",
  description: "Impressum von Buzzard Kfz-Teile – Angaben gemäß § 5 TMG.",
};

export default function ImpressumPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link> <span>/</span> <span>Impressum</span>
          </nav>
          <h1>Impressum</h1>
          <p>Angaben gemäß § 5 TMG</p>
        </div>
      </section>

      <div className="subpage-content">
        <section>
          <h2>Angaben zum Unternehmen</h2>
          <p>
            <strong>Buzzard Kfz-Teile</strong>
            <br />
            Dautphetal
            <br />
            Deutschland
          </p>
          <p>
            Telefon: <a href="tel:+4930000000">+49 30 0000000</a>
            <br />
            E-Mail: <a href="mailto:info@buzzard.com">info@buzzard.com</a>
          </p>
        </section>

        <section>
          <h2>Verantwortlich für den Inhalt</h2>
          <p>
            Buzzard Kfz-Teile
            <br />
            Dautphetal, Deutschland
            <br />
            E-Mail: <a href="mailto:info@buzzard.com">info@buzzard.com</a>
          </p>
          <p>Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV ist die oben genannte Person.</p>
        </section>

        <section>
          <h2>Haftungsausschluss</h2>
          <h3>Haftung für Inhalte</h3>
          <p>
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
            Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
          </p>
          <h3>Haftung für Links</h3>
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
            Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
            verantwortlich.
          </p>
        </section>

        <section>
          <h2>Urheberrecht</h2>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
            dem deutschen Urheberrecht.
          </p>
        </section>
      </div>
    </>
  );
}
