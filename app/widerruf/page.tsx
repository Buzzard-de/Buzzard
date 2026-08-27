import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, catalogModeNotice } from "@/components/LegalPageShell";
import { CONTACT_EMAIL } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Widerrufsrecht",
  description: "Widerrufsbelehrung für Buzzard24 — Informationen für Verbraucher.",
};

export default function WiderrufPage() {
  return (
    <LegalPageShell
      title="Widerrufsrecht"
      description="Informationen zum Widerruf bei Fernabsatzverträgen"
      breadcrumb="Widerruf"
    >
      {catalogModeNotice()}

      <section>
        <h2>Aktueller Status</h2>
        <p>
          Buzzard24 befindet sich im <strong>Katalogmodus</strong>. Es werden derzeit keine Waren oder
          Dienstleistungen im Fernabsatz verkauft. Ein Widerrufsrecht nach § 312g BGB entsteht erst mit
          Abschluss eines Kaufvertrags im Online-Shop.
        </p>
      </section>

      <section>
        <h2>Widerrufsrecht für Verbraucher (bei Verkaufsstart)</h2>
        <p>
          Sobald der Online-Verkauf aktiv ist, informieren wir Verbraucher über das gesetzliche
          Widerrufsrecht, die Widerrufsfrist von 14 Tagen sowie über Ausnahmen (z. B. versiegelte
          Waren nach Öffnung). Die vollständige Widerrufsbelehrung und das Muster-Widerrufsformular
          werden vor dem Verkaufsstart auf dieser Seite veröffentlicht.
        </p>
      </section>

      <section>
        <h2>Kontakt bei Fragen</h2>
        <p>
          Bei Fragen erreichen Sie uns unter <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> oder
          über das <Link href="/impressum/">Kontaktformular</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
