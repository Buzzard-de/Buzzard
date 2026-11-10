import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, catalogModeNotice } from "@/components/LegalPageShell";
import AgriculturalSearchPanel from "@/components/agriculturalMachinery/AgriculturalSearchPanel";
import MachineryDomainLinks from "@/components/machinery/MachineryDomainLinks";

export const metadata: Metadata = {
  title: "Landmaschinen-Teilesuche",
  description: "Landtechnik OEM- und Kompatibilitätssuche — Katalogmodus, getrennt von Bau und Kfz.",
};

export default function AgriculturalMachinerySearchPage() {
  return (
    <LegalPageShell
      title="Landmaschinen-Teilesuche"
      description="Nur Landwirtschaft — ohne Baumaschinen- oder Kfz-Regeln"
      breadcrumb="Landwirtschaft"
    >
      {catalogModeNotice()}
      <p>
        Shop-Kategorie bleibt{" "}
        <Link href="/kategorie/tier-und-landwirtschaftsausruestung/">Landwirtschaft & Agrar</Link>.
      </p>
      <MachineryDomainLinks current="agricultural" />
      <AgriculturalSearchPanel />
    </LegalPageShell>
  );
}
