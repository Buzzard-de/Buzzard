import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Automotive Health" };

export default function AdminAutomotiveHealthPage() {
  return (
    <AdminShell>
      <div className="admin-panel">
        <h1>Automotive Health</h1>
        <p>API: <code>GET /api/admin/automotive/health</code></p>
        <p>Diagnostic metrics — no secrets exposed.</p>
      </div>
    </AdminShell>
  );
}
