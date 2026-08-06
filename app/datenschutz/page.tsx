import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutz – Buzzard",
  description:
    "Datenschutzerklärung von Buzzard Kfz-Teile – Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
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
            <strong>Buzzard Kfz-Teile</strong>
            <br />
            Dautphetal, Deutschland
            <br />
            E-Mail: <a href="mailto:info@buzzard.com">info@buzzard.com</a>
            <br />
            Telefon: <a href="tel:+4930000000">+49 30 0000000</a>
          </p>
        </section>

        <section>
          <h2>Erhebung personenbezogener Daten</h2>
          <h3>Kontaktformular</h3>
          <p>Wenn Sie unser Kontaktformular nutzen, erheben wir Name, E-Mail-Adresse und Nachricht.</p>
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
          <h2>Cookies und Tracking</h2>
          <p>
            Diese Website verwendet keine Tracking-Cookies. Der Warenkorb speichert Artikel lokal
            im Browser (localStorage). Bestelldaten werden nur temporär in der aktuellen
            Browsersitzung (sessionStorage) gehalten und nach der Bestätigungsseite gelöscht.
          </p>
        </section>

        <section>
          <h2>Sicherheit</h2>
          <p>
            Wir setzen technische Schutzmaßnahmen ein (Content Security Policy, Eingabevalidierung,
            Honeypot-Schutz im Kontaktformular). Meldungen zu Sicherheitslücken nehmen wir unter{" "}
            <a href="mailto:info@buzzard.com">info@buzzard.com</a> entgegen.
          </p>
        </section>

        <section>
          <h2>Rechte der betroffenen Person</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
            Datenübertragbarkeit und Widerspruch gemäß DSGVO.
          </p>
        </section>

        <section>
          <h2>Kontakt für Datenschutzanfragen</h2>
          <p>
            Buzzard Kfz-Teile
            <br />
            Dautphetal, Deutschland
            <br />
            E-Mail: <a href="mailto:info@buzzard.com">info@buzzard.com</a>
          </p>
          <p>
            <small>Stand: August 2026</small>
          </p>
        </section>
      </div>
    </>
  );
}
