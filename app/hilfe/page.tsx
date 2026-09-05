import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { LegalPageShell, catalogModeNotice } from "@/components/LegalPageShell";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/site/contact";

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
      {catalogModeNotice()}

      <section id="faq">
        <h2>Häufige Fragen</h2>

        <h3>Kann ich bereits bestellen?</h3>
        <p>
          Der <strong>Online-Checkout</strong> ist noch nicht aktiv. Sie können Produkte und Kategorien
          vollständig ansehen, Artikel in den Warenkorb legen und uns eine Anfrage senden. Mit Verkaufsstart
          werden Preise und Checkout freigeschaltet.
        </p>

        <h3>Warum steht „Preis auf Anfrage“?</h3>
        <p>
          Im Katalogmodus werden keine Verkaufspreise angezeigt. So können Sie sich unverbindlich über das
          Sortiment informieren. Für Preisanfragen nutzen Sie das Kontaktformular oder rufen Sie uns an.
        </p>

        <h3>Funktionieren Konto und Backend?</h3>
        <p>
          Ja. Unser Backend ist online. Kundenkonto, Admin-Bereich und API sind erreichbar. Produktbewertungen
          und der vollständige Checkout werden mit Aktivierung des Verkaufs freigeschaltet.
        </p>

        <h3>Wie erreiche ich den Support?</h3>
        <p>
          Telefon: <a href={`tel:${CONTACT_PHONE_TEL}`}>{CONTACT_PHONE_DISPLAY}</a>
          <br />
          E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <br />
          Kontaktformular unten auf dieser Seite oder unter <Link href="/impressum/">Impressum</Link>.
          <br />
          Wir antworten in der Regel innerhalb von 1–2 Werktagen.
        </p>

        <h3>Wann startet der Online-Verkauf?</h3>
        <p>
          Sobald Sortiment, Zahlungsanbieter und Versandprozesse abgeschlossen sind. Bis dahin informieren wir
          Sie auf der Website und per Newsletter.
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

      <section id="kontakt" className="contact-form">
        <h2>Kontakt</h2>
        <p>Schreiben Sie uns — wir melden uns so schnell wie möglich.</p>
        <ContactForm />
      </section>
    </LegalPageShell>
  );
}
