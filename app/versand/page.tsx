import type { Metadata } from "next";
import { LegalPageShell, legalStubNotice } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Versand & Lieferung",
  description: "Informationen zu Versand und Lieferung bei Buzzard24.",
};

export default function VersandPage() {
  return (
    <LegalPageShell
      title="Versand & Lieferung"
      description="Informationen zur Lieferung — wird vor Verkaufsstart finalisiert"
      breadcrumb="Versand"
    >
      {legalStubNotice()}

      <section>
        <h2>Liefergebiet</h2>
        <p>Deutschland und weitere EU-Länder — Details folgen mit dem Verkaufsstart.</p>
      </section>

      <section>
        <h2>Lieferzeiten</h2>
        <p>
          Angestrebte Lieferzeit: 1–3 Werktage innerhalb Deutschlands, sobald der Versand aktiv ist. Im
          Katalogmodus erfolgt noch kein Versand.
        </p>
      </section>

      <section>
        <h2>Versandkosten</h2>
        <p>
          Versandkosten und ggf. kostenloser Versand ab einem Bestellwert werden vor dem Verkaufsstart hier
          veröffentlicht.
        </p>
      </section>
    </LegalPageShell>
  );
}
