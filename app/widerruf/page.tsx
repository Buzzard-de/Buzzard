import type { Metadata } from "next";
import { LegalPageShell, legalStubNotice } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Widerrufsrecht",
  description: "Widerrufsbelehrung für Buzzard24 — Vorbereitung für den Verkauf.",
};

export default function WiderrufPage() {
  return (
    <LegalPageShell
      title="Widerrufsrecht"
      description="Informationen zum Widerruf — wird vor Verkaufsstart finalisiert"
      breadcrumb="Widerruf"
    >
      {legalStubNotice()}

      <section>
        <h2>Widerrufsrecht für Verbraucher</h2>
        <p>
          Verbrauchern steht nach deutschem Recht ein Widerrufsrecht zu, sobald der Online-Verkauf aktiv ist.
          Die vollständige Widerrufsbelehrung und das Muster-Widerrufsformular werden vor dem Verkaufsstart
          hier veröffentlicht.
        </p>
      </section>

      <section>
        <h2>Kontakt bei Fragen</h2>
        <p>
          Bei Fragen zum Widerruf erreichen Sie uns unter info@buzzard.com oder über das{" "}
          <a href="/impressum/">Kontaktformular</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
