import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

export const metadata = {
  title: "Automotive Orders",
};

export default function AdminAutomotiveOrdersPage() {
  return (
    <AdminShell>
      <div className="admin-panel">
        <h1>Automotive Orders</h1>
        <p>Order live integration blocked. ORDER_LIVE_ENABLED=0.</p>
        <p><Link href="/admin/automotive/integrations">← Integrations</Link></p>
      </div>
    </AdminShell>
  );
}
