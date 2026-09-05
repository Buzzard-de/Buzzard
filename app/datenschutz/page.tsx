import type { Metadata } from "next";
import Link from "next/link";
import CompanyAddress from "@/components/CompanyAddress";
import { COMPANY_LEGAL_NAME } from "@/lib/site/company";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Datenschutz",
  description:
    "Datenschutzerklärung von Buzzard24 (Buzzard Kfz-Teile) – Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
};

export default function DatenschutzPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-inner">
          <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Startseite</Link> <span>/</span> <span>Datenschutz</span>
          </nav>
          <h1>Datenschutz</h1>
          <p>Informationen gemäß DSGVO</p>
        </div>
      </section>

      <div className="subpage-content">
        <section>
          <h2>Verantwortlicher</h2>
          <p>
            <strong>{COMPANY_LEGAL_NAME}</strong>
            <br />
            <CompanyAddress />
            <br />
            E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <br />
            Telefon: <a href={`tel:${CONTACT_PHONE_TEL}`}>{CONTACT_PHONE_DISPLAY}</a>
          </p>
        </section>

        <section>
          <h2>Erhebung personenbezogener Daten</h2>
          <h3>Kontaktformular & Newsletter</h3>
          <p>
            Wenn Sie unser Kontaktformular oder die Newsletter-Anmeldung nutzen, erheben wir die von Ihnen
            eingegebenen Daten (z. B. Name, E-Mail-Adresse, Nachricht). Die Übermittlung erfolgt über unsere
            API (gehostet bei Render) und wird in unserem Backend gespeichert, damit wir Ihre Anfrage
            bearbeiten können. Alternativ können Sie uns jederzeit direkt unter {CONTACT_EMAIL} erreichen.
          </p>
          <h3>Kundenkonto & Backend</h3>
          <p>
            Wenn Sie ein Kundenkonto anlegen oder sich im Admin-Bereich anmelden, werden die dafür
            erforderlichen Daten über unser Backend (gehostet bei Render) verarbeitet. Dazu gehören
            E-Mail-Adresse, Passwort (verschlüsselt) und ggf. Bestell- oder Profildaten.
          </p>
          <h3>Automatisch erhobene Daten</h3>
          <p>
            Beim Aufrufen unserer Website können technische Verbindungsdaten wie IP-Adresse,
            Datum und Uhrzeit des Zugriffs sowie Browserinformationen verarbeitet werden.
          </p>
        </section>

        <section>
          <h2>Hosting – GitHub Pages</h2>
          <p>
            Diese Website wird über GitHub Pages gehostet. Weitere Informationen finden Sie in der{" "}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutzerklärung von GitHub
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Cookies und lokale Speicherung</h2>
          <p>
            Diese Website verwendet keine Tracking-Cookies. Der Warenkorb speichert Artikel lokal
            im Browser (localStorage). Bestelldaten werden nur temporär in der aktuellen
            Browsersitzung (sessionStorage) gehalten. Im Katalogmodus sind keine Bestellungen möglich.
          </p>
        </section>

        <section>
          <h2>Sicherheit</h2>
          <p>
            Wir setzen technische Schutzmaßnahmen ein (Content Security Policy, Eingabevalidierung,
            Honeypot-Schutz im Kontaktformular). Meldungen zu Sicherheitslücken nehmen wir unter{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> entgegen.
          </p>
        </section>

        <section>
          <h2>Rechte der betroffenen Person</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
            Datenübertragbarkeit und Widerspruch gemäß DSGVO. Wenden Sie sich dazu an{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </section>

        <section>
          <h2>Kontakt für Datenschutzanfragen</h2>
          <p>
            {COMPANY_LEGAL_NAME}
            <br />
            <CompanyAddress />
            <br />
            E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <p>
            <small>Stand: August 2026</small>
          </p>
        </section>
      </div>
    </>
  );
}
