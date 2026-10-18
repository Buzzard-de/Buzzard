import type { Metadata } from "next";
import { QrCampaignLanding } from "@/components/campaign/QrCampaignLanding";

export const metadata: Metadata = {
  title: "Buzzard Treue-QR",
  description: "QR-Kampagnenlanding — Katalogmodus, kein Live-Rabatt.",
};

export default function QrCampaignPage() {
  return <QrCampaignLanding />;
}
