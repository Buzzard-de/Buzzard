"use client";

import { useEffect, useState } from "react";
import { fetchAdminSuppliers } from "@/lib/admin/client";
import type { AdminSupplier } from "@/lib/admin/types";

export default function AdminSuppliersPanel() {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [mappings, setMappings] = useState<Array<{ id: string; supplier_category: string; buzzard_category_id: string }>>([]);

  useEffect(() => {
    fetchAdminSuppliers().then((data) => {
      setSuppliers(data.suppliers);
      setMappings(data.mappings as typeof mappings);
    });
  }, []);

  return (
    <div className="admin-page">
      <h1>Lieferanten</h1>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Feed</th>
              <th>Status</th>
              <th>Sync</th>
              <th>Secret</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.supplier_id}>
                <td>{s.supplier_id}</td>
                <td>{s.supplier_name}</td>
                <td>{s.feed_type}</td>
                <td>{s.active ? "aktiv" : "inaktiv"}</td>
                <td>{s.sync_status} {s.last_sync_at ? `· ${new Date(s.last_sync_at).toLocaleString("de-DE")}` : ""}</td>
                <td>{s.has_api_secret ? "✓ gesetzt" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="admin-panel">
        <h2>Kategorie-Mapping</h2>
        <table className="admin-table">
          <thead>
            <tr><th>Lieferant</th><th>Lieferanten-Kategorie</th><th>Buzzard-Kategorie</th></tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.id}>
                <td>{(m as { supplier_id?: string }).supplier_id || "—"}</td>
                <td>{m.supplier_category}</td>
                <td>{m.buzzard_category_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
