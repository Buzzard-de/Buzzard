"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/lib/admin/context";
import {
  ANALYTICS_RANGE_OPTIONS,
  downloadAnalyticsExport,
  fetchAnalyticsOverview,
  fetchCategoryAnalytics,
  fetchCustomerAnalytics,
  fetchFinanceAnalytics,
  fetchInventoryAnalytics,
  fetchProductAnalytics,
  fetchSalesAnalytics,
  fetchSupplierAnalytics,
} from "@/lib/analytics/client";
import type { AnalyticsOverview, AnalyticsRangePreset } from "@/lib/analytics/types";
import { formatPrice } from "@/lib/products";
import SimpleBarChart from "./charts/SimpleBarChart";
import SimpleLineChart from "./charts/SimpleLineChart";

type TabId = "overview" | "sales" | "products" | "categories" | "customers" | "inventory" | "suppliers" | "finance";

const TAB_ROLE: Record<TabId, string[]> = {
  overview: ["administrator", "catalog_manager", "order_manager", "read_only"],
  sales: ["administrator", "order_manager", "read_only"],
  products: ["administrator", "catalog_manager", "read_only"],
  categories: ["administrator", "catalog_manager", "read_only"],
  customers: ["administrator", "order_manager"],
  inventory: ["administrator", "catalog_manager", "read_only"],
  suppliers: ["administrator", "catalog_manager", "order_manager"],
  finance: ["administrator"],
};

export default function AdminAnalyticsHub({ initialTab = "overview" }: { initialTab?: TabId }) {
  const { user } = useAdminAuth();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [range, setRange] = useState<AnalyticsRangePreset>("last_30_days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [sales, setSales] = useState<Awaited<ReturnType<typeof fetchSalesAnalytics>> | null>(null);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof fetchProductAnalytics>> | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof fetchCategoryAnalytics>> | null>(null);
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof fetchCustomerAnalytics>> | null>(null);
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof fetchInventoryAnalytics>> | null>(null);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof fetchSupplierAnalytics>> | null>(null);
  const [finance, setFinance] = useState<Awaited<ReturnType<typeof fetchFinanceAnalytics>> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const visibleTabs = useMemo(
    () => (Object.keys(TAB_ROLE) as TabId[]).filter((id) => user && TAB_ROLE[id].includes(user.role)),
    [user]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorKey(null);
    const from = range === "custom" ? customFrom : undefined;
    const to = range === "custom" ? customTo : undefined;
    try {
      if (tab === "overview" || tab === "sales") {
        const overviewData = await fetchAnalyticsOverview(range, from, to);
        setOverview(overviewData);
        if (tab === "overview") {
          setSales(await fetchSalesAnalytics(range, from, to));
        }
      }
      if (tab === "sales") setSales(await fetchSalesAnalytics(range, from, to));
      if (tab === "products") setProducts(await fetchProductAnalytics(range, from, to));
      if (tab === "categories") setCategories(await fetchCategoryAnalytics(range, selectedCategory || undefined, from, to));
      if (tab === "customers") setCustomers(await fetchCustomerAnalytics(range, from, to));
      if (tab === "inventory") setInventory(await fetchInventoryAnalytics());
      if (tab === "suppliers") setSuppliers(await fetchSupplierAnalytics(range, from, to));
      if (tab === "finance") setFinance(await fetchFinanceAnalytics(range, from, to));
    } catch (err) {
      setErrorKey(err instanceof Error ? err.message : "admin.requestFailed");
    } finally {
      setLoading(false);
    }
  }, [user, tab, range, customFrom, customTo, selectedCategory]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0] || "overview");
  }, [visibleTabs, tab]);

  async function handleExport(section: string) {
    try {
      await downloadAnalyticsExport(section, range, "csv");
    } catch {
      setErrorKey("admin.requestFailed");
    }
  }

  const kpis = overview?.kpis;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Analytics</h1>
          {overview?.range && (
            <p className="admin-meta">
              {overview.range.start} – {overview.range.end} ({overview.range.timezone})
            </p>
          )}
        </div>
        <div className="admin-toolbar">
          <select value={range} onChange={(e) => setRange(e.target.value as AnalyticsRangePreset)}>
            {ANALYTICS_RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
            ))}
          </select>
          {range === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
          <button type="button" className="shop-btn-secondary" onClick={load} disabled={loading}>
            Aktualisieren
          </button>
        </div>
      </div>

      <nav className="admin-tab-nav">
        {visibleTabs.map((id) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {id}
          </button>
        ))}
      </nav>

      {errorKey && <p className="admin-message">{errorKey}</p>}
      {loading && !overview && <div className="admin-loading">…</div>}

      {(tab === "overview" || tab === "sales") && kpis && (
        <div className="admin-stat-grid">
          <article className="admin-stat"><strong>{formatPrice(kpis.revenue)}</strong><span>Umsatz</span></article>
          <article className="admin-stat"><strong>{kpis.orders}</strong><span>Bestellungen</span></article>
          <article className="admin-stat"><strong>{formatPrice(kpis.averageOrderValue)}</strong><span>Ø Warenkorb</span></article>
          <article className="admin-stat"><strong>{kpis.unitsSold}</strong><span>Verkaufte Einheiten</span></article>
          <article className="admin-stat"><strong>{kpis.newCustomers}</strong><span>Neue Kunden</span></article>
          <article className="admin-stat"><strong>{kpis.refunds}</strong><span>Erstattungen</span></article>
          <article className="admin-stat"><strong>{formatPrice(kpis.shippingRevenue)}</strong><span>Versanderlös</span></article>
          <article className="admin-stat"><strong>{kpis.stockAlerts}</strong><span>Bestandswarnungen</span></article>
          {kpis.estimatedGrossProfit != null && (
            <article className="admin-stat admin-stat-estimate">
              <strong>{formatPrice(kpis.estimatedGrossProfit)}</strong>
              <span>Geschätzter Rohertrag*</span>
            </article>
          )}
        </div>
      )}

      {tab === "overview" && sales && (
        <section className="admin-panel">
          <div className="admin-section-head">
            <h2>Umsatz-Trend</h2>
            <button type="button" className="shop-btn-secondary" onClick={() => handleExport("sales")}>CSV Export</button>
          </div>
          <SimpleLineChart
            points={sales.trend.map((row) => ({ label: row.date, value: row.revenue }))}
            valuePrefix="€ "
          />
        </section>
      )}

      {tab === "sales" && sales && (
        <>
          <section className="admin-panel">
            <div className="admin-section-head">
              <h2>Top Produkte</h2>
              <button type="button" className="shop-btn-secondary" onClick={() => handleExport("sales")}>CSV Export</button>
            </div>
            <SimpleBarChart items={sales.topProducts.map((p) => ({ label: p.name, value: p.revenue }))} valuePrefix="€ " />
          </section>
          <section className="admin-panel">
            <h2>Verkäufe nach Land</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Land</th><th>Umsatz</th></tr></thead>
                <tbody>
                  {sales.salesByCountry.map((row) => (
                    <tr key={row.country}><td>{row.country}</td><td>{formatPrice(row.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "products" && products && (
        <>
          <section className="admin-panel">
            <div className="admin-section-head">
              <h2>Bestseller</h2>
              <button type="button" className="shop-btn-secondary" onClick={() => handleExport("products")}>CSV Export</button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Produkt</th><th>SKU</th><th>Stück</th><th>Umsatz</th></tr></thead>
                <tbody>
                  {products.bestSellers.map((row) => (
                    <tr key={row.productId}>
                      <td><Link href={`/admin/products/${row.productId}/`}>{row.name}</Link></td>
                      <td>{row.sku}</td>
                      <td>{row.units}</td>
                      <td>{formatPrice(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="admin-panel">
            <h2>Niedriger Bestand</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Produkt</th><th>Bestand</th></tr></thead>
                <tbody>
                  {products.lowStock.map((row) => (
                    <tr key={row.productId}><td>{row.name}</td><td>{row.stock}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === "categories" && categories && (
        <section className="admin-panel">
          <div className="admin-section-head">
            <h2>Kategorien {selectedCategory ? `(Drill-down)` : ""}</h2>
            <div className="admin-toolbar">
              {selectedCategory && (
                <button type="button" className="shop-btn-secondary" onClick={() => setSelectedCategory(null)}>
                  Zurück
                </button>
              )}
              <button type="button" className="shop-btn-secondary" onClick={() => handleExport("categories")}>CSV Export</button>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Kategorie</th><th>Umsatz</th><th>Stück</th><th>Bestellungen</th><th /></tr></thead>
              <tbody>
                {categories.categories.map((row) => (
                  <tr key={row.categoryId}>
                    <td>{row.name}</td>
                    <td>{formatPrice(row.revenue)}</td>
                    <td>{row.units}</td>
                    <td>{row.orders}</td>
                    <td>
                      {!selectedCategory && (
                        <button type="button" className="shop-btn-secondary" onClick={() => setSelectedCategory(row.categoryId)}>
                          Drill-down
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "customers" && customers && (
        <section className="admin-panel">
          <div className="admin-stat-grid">
            <article className="admin-stat"><strong>{customers.newCustomers}</strong><span>Neue Kunden</span></article>
            <article className="admin-stat"><strong>{customers.returningCustomers}</strong><span>Wiederkehrend</span></article>
            <article className="admin-stat"><strong>{formatPrice(customers.averageCustomerValue)}</strong><span>Ø Kundenwert</span></article>
          </div>
          <h2>Geografie</h2>
          <SimpleBarChart items={customers.geographicDistribution.map((row) => ({ label: row.country, value: row.orders }))} />
        </section>
      )}

      {tab === "inventory" && inventory && (
        <section className="admin-panel">
          <div className="admin-stat-grid">
            <article className="admin-stat"><strong>{inventory.totals.activeProducts}</strong><span>Aktive Produkte</span></article>
            <article className="admin-stat"><strong>{inventory.totals.inStock}</strong><span>Auf Lager</span></article>
            <article className="admin-stat"><strong>{inventory.totals.lowStock}</strong><span>Niedriger Bestand</span></article>
            <article className="admin-stat"><strong>{inventory.totals.outOfStock}</strong><span>Nicht verfügbar</span></article>
            <article className="admin-stat"><strong>{inventory.syncErrors}</strong><span>Sync-Fehler</span></article>
          </div>
          <p className="admin-meta">Schwellwert niedriger Bestand: {inventory.lowStockThreshold}</p>
        </section>
      )}

      {tab === "suppliers" && suppliers && (
        <section className="admin-panel">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Lieferant</th><th>Bestellungen</th><th>Erfolgsquote</th><th>Fehler</th></tr></thead>
              <tbody>
                {suppliers.suppliers.map((row) => (
                  <tr key={row.supplierId}>
                    <td>{row.supplierId}</td>
                    <td>{row.orders}</td>
                    <td>{row.successRate}%</td>
                    <td>{row.failed + row.fulfillmentFailures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "finance" && finance && (
        <section className="admin-panel">
          <p className="admin-meta">{finance.disclaimer}</p>
          <div className="admin-stat-grid">
            <article className="admin-stat"><strong>{formatPrice(finance.grossSales)}</strong><span>Bruttoumsatz</span></article>
            <article className="admin-stat"><strong>{formatPrice(finance.discounts)}</strong><span>Rabatte</span></article>
            <article className="admin-stat"><strong>{formatPrice(finance.refunds)}</strong><span>Erstattungen</span></article>
            <article className="admin-stat"><strong>{formatPrice(finance.shippingRevenue)}</strong><span>Versanderlös</span></article>
            <article className="admin-stat admin-stat-estimate"><strong>{formatPrice(finance.supplierCost)}</strong><span>Lieferantenkosten*</span></article>
            <article className="admin-stat admin-stat-estimate"><strong>{formatPrice(finance.estimatedGrossProfit)}</strong><span>Geschätzter Rohertrag*</span></article>
            <article className="admin-stat admin-stat-estimate"><strong>{formatPrice(finance.estimatedContributionMargin)}</strong><span>Geschätzte DB*</span></article>
          </div>
          <button type="button" className="shop-btn-secondary" onClick={() => handleExport("finance")}>CSV Export</button>
        </section>
      )}

      {overview?.notes?.estimatedGrossProfit && tab === "overview" && (
        <p className="admin-meta">* Operative Schätzung – ersetzt keine buchhalterische Gewinnermittlung.</p>
      )}
    </div>
  );
}
