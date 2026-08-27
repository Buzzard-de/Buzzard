import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, catalogModeNotice } from "@/components/LegalPageShell";
import { CONTACT_EMAIL } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Versand & Lieferung",
  description: "Informationen zu Versand und Lieferung bei Buzzard24.",
};

export default function VersandPage() {
  return (
    <LegalPageShell
      title="Versand & Lieferung"
      description="Informationen zur Lieferung bei Buzzard24"
      breadcrumb="Versand"
    >
      {catalogModeNotice()}

      <section>
        <h2>Aktueller Status</h2>
        <p>
          Im <strong>Katalogmodus</strong> erfolgt kein Versand und keine Lieferung. Sie können Produkte
          ansehen und uns für Beratung oder Verfügbarkeitsanfragen kontaktieren.
        </p>
      </section>

      <section>
        <h2>Geplantes Liefergebiet (bei Verkaufsstart)</h2>
        <p>Deutschland und weitere EU-Länder — Details werden vor Aktivierung des Verkaufs veröffentlicht.</p>
      </section>

      <section>
        <h2>Geplante Lieferzeiten (bei Verkaufsstart)</h2>
        <p>
          Angestrebte Lieferzeit: 1–3 Werktage innerhalb Deutschlands, abhängig von Verfügbarkeit und
          Lieferadresse. Konkrete Angaben folgen mit dem Verkaufsstart.
        </p>
      </section>

      <section>
        <h2>Versandkosten (bei Verkaufsstart)</h2>
        <p>
          Versandkosten und ggf. kostenloser Versand ab einem Bestellwert werden vor Aktivierung des
          Online-Verkaufs hier veröffentlicht.
        </p>
      </section>

      <section>
        <h2>Beratung & Anfragen</h2>
        <p>
          Für Fragen zu Produkten oder geplantem Versand:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> oder{" "}
          <Link href="/impressum/">Kontaktformular</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
