"use client";

import { useEffect, useState } from "react";
import { fetchAdminOrders, fetchAdminProducts, fetchAdminSuppliers, fetchSyncLogs } from "@/lib/admin/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, suppliers: 0, orders: 0, syncJobs: 0, failedImports: 0 });

  useEffect(() => {
    Promise.all([fetchAdminProducts(), fetchAdminSuppliers(), fetchAdminOrders(), fetchSyncLogs()])
      .then(([products, supplierData, orders, sync]) => {
        setStats({
          products: products.length,
          suppliers: supplierData.suppliers.length,
          orders: orders.length,
          syncJobs: sync.syncJobs.length,
          failedImports: sync.importLogs.filter((l) => l.retry_status === "pending").length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="admin-page">
      <h1>Dashboard</h1>
      <div className="admin-stat-grid">
        <article className="admin-stat"><strong>{stats.products}</strong><span>Produkte</span></article>
        <article className="admin-stat"><strong>{stats.suppliers}</strong><span>Lieferanten</span></article>
        <article className="admin-stat"><strong>{stats.orders}</strong><span>Bestellungen</span></article>
        <article className="admin-stat"><strong>{stats.syncJobs}</strong><span>Sync-Jobs</span></article>
        <article className="admin-stat"><strong>{stats.failedImports}</strong><span>Fehler (offen)</span></article>
      </div>
      <section className="admin-panel">
        <h2>Hinweise</h2>
        <ul className="admin-list">
          <li>Lieferantenpreise und API-Secrets sind nur im Admin/API sichtbar.</li>
          <li>Die 41 Buzzard-Hauptkategorien bleiben die Navigations-Quelle.</li>
          <li>Importe laufen über die normalisierte Pipeline (JSON/CSV/manuell).</li>
        </ul>
      </section>
    </div>
  );
}
