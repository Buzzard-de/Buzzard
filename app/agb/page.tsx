import type { Metadata } from "next";
import { LegalPageShell, legalStubNotice } from "@/components/LegalPageShell";
import { CONTACT_EMAIL } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen von Buzzard24 — Vorbereitung für den Verkaufsstart.",
};

export default function AgbPage() {
  return (
    <LegalPageShell
      title="Allgemeine Geschäftsbedingungen (AGB)"
      description="Vorbereitet für den Online-Verkauf"
      breadcrumb="AGB"
    >
      {legalStubNotice()}

      <section>
        <h2>§ 1 Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für Bestellungen über den Online-Shop Buzzard24
          (buzzard24.de), sobald der Verkaufsmodus aktiviert ist. Bis dahin dient die Website als Katalog zur
          Produktinformation.
        </p>
      </section>

      <section>
        <h2>§ 2 Vertragspartner</h2>
        <p>
          Buzzard Kfz-Teile, Dautphetal, Deutschland. Kontakt: {CONTACT_EMAIL}
        </p>
      </section>

      <section>
        <h2>§ 3 Vertragsschluss</h2>
        <p>
          Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot dar. Ein Vertrag
          kommt erst mit Bestellbestätigung zustande — sobald der Verkauf freigeschaltet ist.
        </p>
      </section>

      <section>
        <h2>§ 4 Preise & Zahlung</h2>
        <p>
          Preise und Zahlungsbedingungen werden vor dem Verkaufsstart veröffentlicht. Es gelten die zum
          Bestellzeitpunkt angezeigten Preise inklusive gesetzlicher Mehrwertsteuer.
        </p>
      </section>

      <section>
        <h2>§ 5 Schlussbestimmungen</h2>
        <p>
          Es gilt deutsches Recht. Diese AGB werden vor dem Verkaufsstart finalisiert und hier veröffentlicht.
        </p>
      </section>
    </LegalPageShell>
  );
}
