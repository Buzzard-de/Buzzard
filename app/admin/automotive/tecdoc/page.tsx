import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

export const metadata = {
  title: "Automotive TecDoc",
};

export default function AdminAutomotiveTecDocPage() {
  return (
    <AdminShell>
      <div className="admin-panel">
        <h1>TecDoc Connector</h1>
        <p>Mock / dry-run mode. Real TecDoc requires TECDOC_ENABLED=1 (blocked by default).</p>
        <p>API: <code>GET /api/admin/automotive/tecdoc/status</code></p>
        <p><Link href="/admin/automotive/integrations">← Integrations</Link></p>
      </div>
    </AdminShell>
  );
}
