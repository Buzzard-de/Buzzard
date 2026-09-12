"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import { fetchFoundationKpis } from "@/lib/analytics/foundationAdminClient";
import type { BusinessKpiDashboard } from "@/lib/analytics/kpi/types";
import type { KpiDateRangePreset } from "@/lib/analytics/kpi/types";
import { formatPrice } from "@/lib/products";
import SimpleBarChart from "@/components/admin/charts/SimpleBarChart";

const RANGE_OPTIONS: KpiDateRangePreset[] = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "current_month",
  "previous_month",
  "custom",
];

const LIMIT_OPTIONS = [10, 25, 50];

function cents(value: number): string {
  return formatPrice(value / 100);
}

function deltaLabel(value: number | null | undefined, suffix = "%"): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

export default function AdminAnalyticsFoundationKpiPanel() {
  const [range, setRange] = useState<KpiDateRangePreset>("last_30_days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [comparePrevious, setComparePrevious] = useState(true);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState<BusinessKpiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await fetchFoundationKpis({
        range,
        from: range === "custom" ? customFrom : undefined,
        to: range === "custom" ? customTo : undefined,
        comparePrevious,
        limit,
      });
      if (!result || !("executive" in result)) {
        setError("KPI-Daten nicht verfügbar");
        setData(null);
        return;
      }
      setData(result as BusinessKpiDashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "KPI request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo, comparePrevious, limit]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload();
  }, [reload]);

  const exec = data?.executive;
  const deltas = data?.deltas;
  const profitability = data?.profitability;

  return (
    <div className="admin-page admin-foundation-kpi" dir="auto">
      <div className="admin-page-head">
        <div>
          <h1>Analytics Intelligence</h1>
          <p className="admin-meta">
            Business KPI Layer — authoritative revenue, funnel, markets & profitability
          </p>
          {data?.range && (
            <p className="admin-meta">
              {data.range.from} – {data.range.to}
            </p>
          )}
        </div>
        <div className="admin-toolbar">
          <select value={range} onChange={(e) => setRange(e.target.value as KpiDateRangePreset)}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {range === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
          <label className="admin-inline-check">
            <input
              type="checkbox"
              checked={comparePrevious}
              onChange={(e) => setComparePrevious(e.target.checked)}
            />
            vs previous period
          </label>
          <button type="button" className="shop-btn-secondary" onClick={reload} disabled={loading}>
            Aktualisieren
          </button>
        </div>
      </div>

      {error && <p className="shop-modal-error">{error}</p>}
      {loading && !data && <p>Lade KPI Dashboard…</p>}

      {exec && (
        <>
          <section className="admin-panel">
            <header className="admin-panel-head">
              <h2>Executive KPIs</h2>
            </header>
            <div className="admin-stat-grid">
              <article className="admin-stat">
                <strong>{exec.orders}</strong>
                <span>Orders {deltas?.orders?.percent != null && `(${deltaLabel(deltas.orders.percent)})`}</span>
              </article>
              <article className="admin-stat">
                <strong>{cents(exec.grossRevenueCents)}</strong>
                <span>Gross Revenue</span>
              </article>
              <article className="admin-stat">
                <strong>{cents(exec.authoritativeRevenueCents)}</strong>
                <span>Authoritative Revenue</span>
              </article>
              <article className="admin-stat">
                <strong>{cents(exec.averageOrderValueCents)}</strong>
                <span>AOV</span>
              </article>
              <article className="admin-stat">
                <strong>{exec.unitsSold}</strong>
                <span>Units Sold</span>
              </article>
              <article className="admin-stat">
                <strong>{cents(exec.revenuePerSessionCents)}</strong>
                <span>Revenue / Session</span>
              </article>
              <article className="admin-stat">
                <strong>{exec.conversionRate.toFixed(2)}%</strong>
                <span>Conversion {deltas?.conversionRate?.points != null && `(${deltaLabel(deltas.conversionRate.points, "pp")})`}</span>
              </article>
              <article className="admin-stat">
                <strong>{cents(exec.netRevenueCents)}</strong>
                <span>Net Revenue</span>
              </article>
            </div>
          </section>

          <section className="admin-panel">
            <header className="admin-panel-head">
              <h2>Conversion Funnel</h2>
            </header>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Count</th>
                    <th>Conversion</th>
                    <th>Drop-off</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.steps.map((step) => (
                    <tr key={step.stage}>
                      <td>{step.stage}</td>
                      <td>{step.count}</td>
                      <td>{step.conversionFromPrevious.toFixed(1)}%</td>
                      <td>{step.dropOffFromPrevious.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="admin-meta">
              Visitor → Purchase: {data.funnel.visitorToPurchase.toFixed(2)}% · Session → Purchase:{" "}
              {data.funnel.sessionToPurchase.toFixed(2)}%
            </p>
          </section>

          {profitability && (
            <section className="admin-panel">
              <header className="admin-panel-head">
                <h2>Profitability (Authoritative)</h2>
              </header>
              <div className="admin-stat-grid">
                <article className="admin-stat">
                  <strong>{cents(profitability.grossRevenueCents)}</strong>
                  <span>Revenue</span>
                </article>
                <article className="admin-stat">
                  <strong>{cents(profitability.productCostCents)}</strong>
                  <span>Product Cost</span>
                </article>
                <article className="admin-stat">
                  <strong>{cents(profitability.shippingCostCents)}</strong>
                  <span>Shipping</span>
                </article>
                <article className="admin-stat">
                  <strong>{cents(profitability.marketplaceFeesCents)}</strong>
                  <span>Marketplace Fees</span>
                </article>
                <article className="admin-stat">
                  <strong>{cents(profitability.paymentFeesCents)}</strong>
                  <span>Payment Fees</span>
                </article>
                <article className="admin-stat">
                  <strong>{cents(profitability.returnRefundImpactCents)}</strong>
                  <span>Return/Refund Impact</span>
                </article>
                <article className="admin-stat">
                  <strong>{cents(profitability.contributionCents)}</strong>
                  <span>Contribution Margin</span>
                </article>
                <article className="admin-stat">
                  <strong>{profitability.contributionMarginPercent.toFixed(2)}%</strong>
                  <span>Margin %</span>
                </article>
              </div>
            </section>
          )}

          <section className="admin-panel">
            <header className="admin-panel-head">
              <h2>Top Products by Revenue</h2>
            </header>
            <SimpleBarChart
              items={data.rankings.productsByRevenue.map((row) => ({
                label: row.label.slice(0, 24),
                value: row.value / 100,
              }))}
              valuePrefix="€ "
            />
          </section>

          <section className="admin-panel">
            <header className="admin-panel-head">
              <h2>Markets & Channels</h2>
            </header>
            <div className="admin-two-col">
              <div>
                <h3>Top Markets</h3>
                <ul className="admin-list-compact">
                  {data.markets.slice(0, limit).map((m) => (
                    <li key={m.market}>
                      {m.market}: {cents(m.revenueCents)} · {m.orders} orders · {m.conversionRate.toFixed(1)}%
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Channels</h3>
                <ul className="admin-list-compact">
                  {data.channels.map((c) => (
                    <li key={c.channel}>
                      {c.channel}: {cents(c.revenueCents)} · {c.orders} orders
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <header className="admin-panel-head">
              <h2>Languages · Traffic · Devices</h2>
            </header>
            <div className="admin-three-col">
              <div>
                <h3>Languages</h3>
                <ul className="admin-list-compact">
                  {data.languages.slice(0, 8).map((l) => (
                    <li key={l.language}>
                      {l.language.toUpperCase()}: {l.sessions} sessions · {l.conversionRate.toFixed(1)}%
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Traffic Sources</h3>
                <ul className="admin-list-compact">
                  {data.traffic.slice(0, 8).map((t) => (
                    <li key={t.source}>
                      {t.source}: {t.sessions} · {t.conversionRate.toFixed(1)}%
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Devices</h3>
                <ul className="admin-list-compact">
                  {data.devices.map((d) => (
                    <li key={d.device}>
                      {d.device}: {d.sessions} · {d.conversionRate.toFixed(1)}%
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
