import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, catalogModeNotice } from "@/components/LegalPageShell";
import CompanyAddress from "@/components/CompanyAddress";
import { COMPANY_LEGAL_NAME } from "@/lib/site/company";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen von Buzzard24 — Katalogmodus und Vorbereitung für den Verkauf.",
};

export default function AgbPage() {
  return (
    <LegalPageShell
      title="Allgemeine Geschäftsbedingungen (AGB)"
      description="Gültig für buzzard24.de im Katalogmodus"
      breadcrumb="AGB"
    >
      {catalogModeNotice()}

      <section>
        <h2>§ 1 Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Website Buzzard24
          (buzzard24.de) durch Verbraucher und Unternehmer. Im aktuellen <strong>Katalogmodus</strong> dient
          die Website der Produktinformation und Kontaktaufnahme — ein Online-Kaufvertrag kommt noch nicht
          zustande.
        </p>
      </section>

      <section>
        <h2>§ 2 Vertragspartner</h2>
        <p>
          <strong>{COMPANY_LEGAL_NAME}</strong>
          <br />
          <CompanyAddress />
          <br />
          E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <br />
          Telefon: {CONTACT_PHONE_DISPLAY}
        </p>
      </section>

      <section>
        <h2>§ 3 Katalogmodus</h2>
        <p>
          Die Darstellung von Produkten und Kategorien stellt kein verbindliches Angebot dar. Preise,
          Verfügbarkeit und Bestellmöglichkeiten werden mit Aktivierung des Verkaufsmodus gesondert
          bekannt gegeben. Anfragen über das <Link href="/hilfe/#kontakt">Kontaktformular</Link> sind unverbindlich.
        </p>
      </section>

      <section>
        <h2>§ 4 Vertragsschluss (bei Verkaufsstart)</h2>
        <p>
          Sobald der Online-Verkauf freigeschaltet ist, kommt ein Kaufvertrag erst mit unserer
          Bestellbestätigung zustande. Bis dahin gelten die Regelungen zum Katalogmodus (§ 3).
        </p>
      </section>

      <section>
        <h2>§ 5 Preise & Zahlung (bei Verkaufsstart)</h2>
        <p>
          Preise und Zahlungsbedingungen werden vor Aktivierung des Verkaufs veröffentlicht. Es gelten
          die zum Bestellzeitpunkt angezeigten Preise inklusive gesetzlicher Mehrwertsteuer.
        </p>
      </section>

      <section>
        <h2>§ 6 Schlussbestimmungen</h2>
        <p>
          Es gilt deutsches Recht. Bei Aktivierung des Verkaufs werden diese AGB um Versand-, Widerrufs-
          und Zahlungsbestimmungen ergänzt und hier veröffentlicht.
        </p>
        <p>
          Weitere Informationen: <Link href="/versand/">Versand</Link>,{" "}
          <Link href="/widerruf/">Widerruf</Link>, <Link href="/hilfe/">Hilfe & FAQ</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
