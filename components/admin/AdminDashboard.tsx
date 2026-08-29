"use client";

import { useEffect, useState } from "react";
import { fetchDashboardSummary } from "@/lib/admin/controlCenter";
import type { DashboardSummary } from "@/lib/admin/controlCenterTypes";
import Link from "next/link";
import SimpleLineChart from "./charts/SimpleLineChart";
import { fetchAnalyticsOverview, fetchSalesAnalytics } from "@/lib/analytics/client";
import type { AnalyticsOverview } from "@/lib/analytics/types";
import { getDemoOrderStats } from "@/lib/commerce";
import { formatPrice } from "@/lib/products";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trend, setTrend] = useState<Array<{ label: string; value: number }>>([]);
  const [demoStats] = useState(getDemoOrderStats);
  const [ccSummary, setCcSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    Promise.all([fetchAnalyticsOverview("last_30_days"), fetchSalesAnalytics("last_30_days")])
      .then(([ov, sales]) => {
        setOverview(ov);
        setTrend(sales.trend.map((row) => ({ label: row.date, value: row.revenue })));
      })
      .catch(() => {});
    fetchDashboardSummary().then(setCcSummary).catch(() => {});
  }, []);

  const kpis = overview?.kpis;
  const showDemoFallback = !kpis;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Dashboard</h1>
        <Link href="/admin/control-center/" className="shop-btn-primary">Control Center</Link>
      </div>

      {ccSummary && (
        <section className="admin-panel">
          <h2>Control Center</h2>
          <div className="admin-stat-grid">
            <article className="admin-stat"><strong>{ccSummary.aiEmployees}</strong><span>AI Çalışan</span></article>
            <article className="admin-stat"><strong>{ccSummary.activeTasks}</strong><span>Aktif Görev</span></article>
            <article className="admin-stat"><strong>{ccSummary.pendingApprovals}</strong><span>Bekleyen Onay</span></article>
            <article className="admin-stat"><strong>{ccSummary.openEscalations}</strong><span>Eskalasyon</span></article>
          </div>
        </section>
      )}

      {kpis && (
        <div className="admin-stat-grid">
          <article className="admin-stat"><strong>{formatPrice(kpis.revenue)}</strong><span>Umsatz (30 Tage)</span></article>
          <article className="admin-stat"><strong>{kpis.orders}</strong><span>Bestellungen</span></article>
          <article className="admin-stat"><strong>{formatPrice(kpis.averageOrderValue)}</strong><span>Ø Warenkorb</span></article>
          <article className="admin-stat"><strong>{kpis.unitsSold}</strong><span>Einheiten</span></article>
          <article className="admin-stat"><strong>{kpis.newCustomers}</strong><span>Neue Kunden</span></article>
          <article className="admin-stat"><strong>{kpis.stockAlerts}</strong><span>Bestandswarnungen</span></article>
        </div>
      )}

      {showDemoFallback && (
        <section className="admin-panel">
          <h2>Demo-Daten (v0.2)</h2>
          <p className="admin-note">Live-Analytics sind ohne API nicht verfügbar. Demo-Bestellungen aus dem E-Commerce-Starter:</p>
          <div className="admin-stat-grid">
            <article className="admin-stat"><strong>{formatPrice(demoStats.revenue)}</strong><span>Demo-Umsatz</span></article>
            <article className="admin-stat"><strong>{demoStats.orders}</strong><span>Demo-Bestellungen</span></article>
          </div>
        </section>
      )}

      <section className="admin-panel">
        <h2>Umsatz-Trend</h2>
        <SimpleLineChart points={trend} valuePrefix="€ " />
      </section>

      <section className="admin-panel">
        <h2>Schnellzugriff</h2>
        <ul className="admin-list">
          <li><Link href="/admin/orders/">Bestellungen verwalten</Link></li>
          <li><Link href="/admin/logistics/">Logistik & Sendungen</Link></li>
          <li><Link href="/admin/products/">Produkte & Bestand</Link></li>
          <li><Link href="/admin/integrations/">Commercial Integrations</Link></li>
          <li><Link href="/admin/analytics/">Detaillierte Reports</Link></li>
        </ul>
      </section>
    </div>
  );
}
