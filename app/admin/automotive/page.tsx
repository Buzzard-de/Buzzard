import AdminShell from "@/components/admin/AdminShell";
import Link from "next/link";

export const metadata = {
  title: "Automotive Core",
};

export default function AdminAutomotivePage() {
  return (
    <AdminShell>
      <div className="admin-panel">
        <h1>Automotive Core Engine</h1>
        <p>Diagnostic admin — 12 Kategorien, Validierung, Fitment, Supplier (dry-run).</p>
        <ul>
          <li><Link href="/admin/automotive/categories">Kategorien</Link></li>
          <li><Link href="/admin/automotive/products">Produkte</Link></li>
          <li><Link href="/admin/automotive/suppliers">Lieferanten</Link></li>
          <li><Link href="/admin/automotive/fitment">Fitment</Link></li>
          <li><Link href="/admin/automotive/mapping">Mapping</Link></li>
          <li><Link href="/admin/automotive/validation">Validierung</Link></li>
          <li><Link href="/admin/automotive/review">Review</Link></li>
          <li><Link href="/admin/automotive/health">Health</Link></li>
          <li><Link href="/admin/automotive/orders">Bestellungen (blockiert)</Link></li>
        </ul>
        <p><strong>Status:</strong> BLOCKED — kein Live-Import, kein Publish, keine Sales.</p>
      </div>
    </AdminShell>
  );
}
