import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, catalogModeNotice } from "@/components/LegalPageShell";
import VehiclePartsSearchPanel from "@/components/vehiclePartsIntelligence/VehiclePartsSearchPanel";
import MachineryDomainLinks from "@/components/machinery/MachineryDomainLinks";

export const metadata: Metadata = {
  title: "Fahrzeugteile-Suche",
  description: "Fahrzeug-OEM- und Kompatibilitätssuche — Katalogmodus, getrennt von Land- und Baumaschinen.",
};

export default function VehiclePartsSearchPage() {
  return (
    <LegalPageShell
      title="Fahrzeugteile-Suche"
      description="Nur Kfz, Nutzfahrzeuge und Zweiräder — ohne Land- oder Baumaschinen-Regeln"
      breadcrumb="Automotive"
    >
      {catalogModeNotice()}
      <p>
        Shop-Kategorie bleibt <Link href="/kategorie/automotive/">Automotive und motorisierte Fahrzeuge</Link>.
      </p>
      <MachineryDomainLinks current="vehicle" />
      <VehiclePartsSearchPanel />
    </LegalPageShell>
  );
}
