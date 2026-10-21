import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, catalogModeNotice } from "@/components/LegalPageShell";
import ConstructionSearchPanel from "@/components/constructionMachinery/ConstructionSearchPanel";
import MachineryDomainLinks from "@/components/machinery/MachineryDomainLinks";

export const metadata: Metadata = {
  title: "Baumaschinen-Teilesuche",
  description: "Katalogsuche und Kompatibilitätsprüfung für Baumaschinen — ohne Live-Bestellung.",
};

export default function ConstructionMachinerySearchPage() {
  return (
    <LegalPageShell
      title="Baumaschinen-Teilesuche"
      description="OEM-Nummern, Maschinenmodell und Seriengrenzen — Katalogmodus"
      breadcrumb="Baumaschinen"
    >
      {catalogModeNotice()}
      <p>
        Shop-Kategorie bleibt{" "}
        <Link href="/kategorie/baumaschinen-und-ersatzteile/">Baumaschinen und Ersatzteile</Link>. Diese Suche
        ersetzt den Kategoriebaum nicht.
      </p>
      <MachineryDomainLinks current="construction" />
      <ConstructionSearchPanel />
    </LegalPageShell>
  );
}
