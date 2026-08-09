"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchAnalyticsCategories,
  fetchAnalyticsCountries,
  fetchAnalyticsDaily,
  fetchAnalyticsDashboardStatus,
  fetchAnalyticsFunnel,
  fetchAnalyticsProducts,
  fetchAnalyticsSources,
  fetchAnalyticsSummary,
} from "@/lib/analyticsDashboard/client";
import type {
  AnalyticsCategoryRow,
  AnalyticsCountryRow,
  AnalyticsDailyPoint,
  AnalyticsDashboardStatus,
  AnalyticsFunnel,
  AnalyticsProductRow,
  AnalyticsSourceRow,
  AnalyticsSummary,
} from "@/lib/analyticsDashboard/types";
import SimpleBarChart from "@/components/admin/charts/SimpleBarChart";
import SimpleLineChart from "@/components/admin/charts/SimpleLineChart";
import { formatPrice } from "@/lib/products";

export default function AdminAnalyticsDashboardPanel() {
  const [status, setStatus] = useState<AnalyticsDashboardStatus | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [daily, setDaily] = useState<AnalyticsDailyPoint[]>([]);
  const [countries, setCountries] = useState<AnalyticsCountryRow[]>([]);
  const [categories, setCategories] = useState<AnalyticsCategoryRow[]>([]);
  const [products, setProducts] = useState<AnalyticsProductRow[]>([]);
  const [sources, setSources] = useState<AnalyticsSourceRow[]>([]);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [
      statusRow,
      summaryRow,
      dailyRows,
      countryRows,
      categoryRows,
      productRows,
      sourceRows,
      funnelRow,
    ] = await Promise.all([
      fetchAnalyticsDashboardStatus(),
      fetchAnalyticsSummary(),
      fetchAnalyticsDaily(),
      fetchAnalyticsCountries(),
      fetchAnalyticsCategories(),
      fetchAnalyticsProducts(),
      fetchAnalyticsSources(),
      fetchAnalyticsFunnel(),
    ]);
    setStatus(statusRow);
    setSummary(summaryRow);
    setDaily(dailyRows);
    setCountries(countryRows);
    setCategories(categoryRows);
    setProducts(productRows);
    setSources(sourceRows);
    setFunnel(funnelRow);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "analyticsDashboard.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Executive Analytics…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Executive Analytics v1.3</h1>
        <p>KPIs, Umsatz, Conversion-Funnel und Marketing-Attribution (SQLite)</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {status && (
        <p className="admin-meta">
          Demo-Daten: {status.totals.orders} Orders · {status.totals.events} Events
        </p>
      )}

      {summary && (
        <section className="admin-kpi-grid">
          <article className="admin-kpi">
            <small>Revenue</small>
            <strong>{formatPrice(summary.revenue)}</strong>
          </article>
          <article className="admin-kpi">
            <small>Gross Profit</small>
            <strong>{formatPrice(summary.estimatedGrossProfit)}</strong>
          </article>
          <article className="admin-kpi">
            <small>Orders</small>
            <strong>{summary.orders}</strong>
          </article>
          <article className="admin-kpi">
            <small>AOV</small>
            <strong>{formatPrice(summary.aov)}</strong>
          </article>
          <article className="admin-kpi">
            <small>Countries</small>
            <strong>{summary.countries}</strong>
          </article>
          <article className="admin-kpi">
            <small>Conversion</small>
            <strong>{summary.conversionRate}%</strong>
          </article>
        </section>
      )}

      {daily.length > 0 && (
        <section className="admin-card">
          <h2>Daily Revenue</h2>
          <SimpleLineChart
            points={daily.map((row) => ({ label: row.day, value: row.revenue }))}
            valuePrefix="€ "
          />
        </section>
      )}

      <div className="admin-grid-two">
        <section className="admin-card">
          <h2>Countries</h2>
          <SimpleBarChart
            items={countries.map((row) => ({ label: row.country, value: row.revenue }))}
            valuePrefix="€ "
          />
        </section>
        <section className="admin-card">
          <h2>Categories</h2>
          <SimpleBarChart
            items={categories.map((row) => ({ label: row.category, value: row.revenue }))}
            valuePrefix="€ "
          />
        </section>
      </div>

      <div className="admin-grid-two">
        <section className="admin-card">
          <h2>Top Products</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 8).map((row) => (
                <tr key={row.sku}>
                  <td>{row.name}</td>
                  <td>{row.orders}</td>
                  <td>{formatPrice(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="admin-card">
          <h2>Marketing Sources</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Purchases</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((row) => (
                <tr key={row.source}>
                  <td>{row.source}</td>
                  <td>{row.purchases}</td>
                  <td>{formatPrice(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {funnel && (
        <section className="admin-card">
          <h2>Conversion Funnel</h2>
          <div className="admin-funnel-grid">
            {[
              ["Page views", funnel.pageViews],
              ["Product views", funnel.productViews, funnel.productRate],
              ["Add to cart", funnel.addToCart, funnel.cartRate],
              ["Checkout", funnel.checkoutStarts, funnel.checkoutRate],
              ["Purchase", funnel.purchases, funnel.purchaseRate],
            ].map(([label, count, rate]) => (
              <article key={String(label)} className="admin-funnel-step">
                <strong>{count as number}</strong>
                <span>{label as string}</span>
                {typeof rate === "number" && <em>{rate}%</em>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
