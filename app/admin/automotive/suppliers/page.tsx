import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

export const metadata = {
  title: "Automotive Suppliers",
};

export default function AdminAutomotiveSuppliersPage() {
  return (
    <AdminShell>
      <div className="admin-panel">
        <h1>Automotive Suppliers</h1>
        <p>Mock and dry-run connectors only. Live import blocked.</p>
        <p>API: <code>GET /api/admin/automotive/suppliers</code></p>
        <p><Link href="/admin/automotive/integrations">← Integrations</Link></p>
      </div>
    </AdminShell>
  );
}
