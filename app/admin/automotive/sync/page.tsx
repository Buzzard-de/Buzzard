import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

export const metadata = {
  title: "Automotive Sync",
};

export default function AdminAutomotiveSyncPage() {
  return (
    <AdminShell>
      <div className="admin-panel">
        <h1>Automotive Sync Scheduler</h1>
        <p>Sync jobs disabled by default. Use dry-run for diagnostics.</p>
        <p>API: <code>POST /api/admin/automotive/sync/dry-run</code></p>
        <p><Link href="/admin/automotive/integrations">← Integrations</Link></p>
      </div>
    </AdminShell>
  );
}
