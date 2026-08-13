import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { LegalPageShell, legalStubNotice } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Hilfe & FAQ",
  description: "Hilfe, häufige Fragen und Kontakt zu Buzzard24 im Katalogmodus.",
};

export default function HilfePage() {
  return (
    <LegalPageShell
      title="Hilfe & FAQ"
      description="Antworten auf häufige Fragen — Buzzard24 Katalogmodus"
      breadcrumb="Hilfe"
    >
      {legalStubNotice()}

      <section id="faq">
        <h2>Häufige Fragen</h2>
        <h3>Kann ich bereits bestellen?</h3>
        <p>
          Nein. Buzzard24 befindet sich im <strong>Katalogmodus</strong>. Sie können Produkte und Kategorien
          ansehen. Online-Bestellungen und Preise werden mit dem Verkaufsstart freigeschaltet.
        </p>
        <h3>Warum steht „Preis auf Anfrage“?</h3>
        <p>
          Im Katalogmodus werden keine Verkaufspreise angezeigt. So können Sie sich unverbindlich über das
          Sortiment informieren.
        </p>
        <h3>Funktionieren Konto und Bewertungen?</h3>
        <p>
          Sobald unser Backend live ist, werden Konto-Sync, Bewertungen und erweiterte Suche verfügbar. Bis dahin
          funktionieren Navigation, Kategorien und Produktseiten vollständig.
        </p>
        <h3>Wie erreiche ich den Support?</h3>
        <p>
          Per Telefon, E-Mail oder über das Kontaktformular unten. Wir antworten in der Regel innerhalb von 1–2
          Werktagen.
        </p>
      </section>

      <section>
        <h2>Weitere Informationen</h2>
        <ul>
          <li>
            <Link href="/agb/">Allgemeine Geschäftsbedingungen (AGB)</Link>
          </li>
          <li>
            <Link href="/versand/">Versand & Lieferung</Link>
          </li>
          <li>
            <Link href="/widerruf/">Widerrufsrecht</Link>
          </li>
          <li>
            <Link href="/datenschutz/">Datenschutz</Link>
          </li>
          <li>
            <Link href="/impressum/">Impressum & Kontakt</Link>
          </li>
        </ul>
      </section>

      <section className="contact-form">
        <h2>Kontakt</h2>
        <p>Schreiben Sie uns — wir melden uns so schnell wie möglich.</p>
        <ContactForm />
      </section>
    </LegalPageShell>
  );
}
