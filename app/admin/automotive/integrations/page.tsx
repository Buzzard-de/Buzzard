import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

export const metadata = {
  title: "Automotive Integrations",
};

export default function AdminAutomotiveIntegrationsPage() {
  return (
    <AdminShell>
      <div className="admin-panel">
        <h1>Automotive Production Integrations</h1>
        <p>Orchestration layer — supplier, TecDoc, sync, safety (diagnostic only).</p>
        <ul>
          <li><Link href="/admin/automotive">Core Engine</Link></li>
          <li><Link href="/admin/automotive/suppliers">Suppliers</Link></li>
          <li><Link href="/admin/automotive/tecdoc">TecDoc</Link></li>
          <li><Link href="/admin/automotive/sync">Sync</Link></li>
          <li><Link href="/admin/automotive/orders">Orders (blocked)</Link></li>
          <li><Link href="/admin/automotive/health">Health</Link></li>
        </ul>
        <p><strong>Status:</strong> BLOCKED — no live supplier, no live TecDoc, no publish.</p>
      </div>
    </AdminShell>
  );
}
