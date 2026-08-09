import AdminIntegrationsPanel from "@/components/admin/AdminIntegrationsPanel";

export const metadata = {
  title: "Buzzard Admin – Integrations",
  description: "Commercial integration status for payments, carriers, tax, FX, suppliers and TecDoc.",
};

export default function AdminIntegrationsPage() {
  return <AdminIntegrationsPanel />;
}
