import type { Metadata } from "next";
import VersandContent from "@/components/legal/VersandContent";

export const metadata: Metadata = {
  title: "Versand & Lieferung",
  description: "Informationen zu Versand und Lieferung bei Buzzard24.",
};

export default function VersandPage() {
  return <VersandContent />;
}
