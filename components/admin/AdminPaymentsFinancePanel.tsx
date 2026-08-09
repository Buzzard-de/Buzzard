"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchFinanceAudit,
  fetchFinanceOverview,
  fetchFinancePayments,
  fetchPaymentsFinanceStatus,
} from "@/lib/paymentsFinance/client";
import type {
  FinanceAuditEvent,
  FinanceOverview,
  PaymentIntentRow,
  PaymentsFinanceStatus,
} from "@/lib/paymentsFinance/types";
import { formatPrice } from "@/lib/products";

const PROVIDERS = ["Stripe", "PayPal", "Klarna", "Card", "Apple Pay", "Refunds", "Invoices", "Reconciliation", "Chargebacks"];

export default function AdminPaymentsFinancePanel() {
  const [status, setStatus] = useState<PaymentsFinanceStatus | null>(null);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [payments, setPayments] = useState<PaymentIntentRow[]>([]);
  const [audit, setAudit] = useState<FinanceAuditEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, paymentRows, auditRows] = await Promise.all([
      fetchPaymentsFinanceStatus(),
      fetchFinanceOverview(),
      fetchFinancePayments(),
      fetchFinanceAudit(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setPayments(paymentRows);
    setAudit(auditRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "paymentsFinance.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Payments & Finance…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Payments & Finance v2.1</h1>
        <p>Payment Intents, Refunds, Invoices, Payouts, Disputes und Finance Audit</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Gross payments", formatPrice(overview.grossPayments)],
            ["Refunds", formatPrice(overview.refunds)],
            ["Net payments", formatPrice(overview.netPayments)],
            ["Invoices", formatPrice(overview.invoicedGross)],
            ["Open disputes", formatPrice(overview.openDisputesAmount)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      {status && (
        <section className="admin-kpi-grid">
          {[
            ["Providers", String(status.totals.providers)],
            ["Methods", String(status.totals.paymentMethods)],
            ["Payments", String(status.totals.paymentIntents)],
            ["Audit events", String(status.totals.auditEvents)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <h2>Payment architecture</h2>
        <div className="admin-tags">
          {PROVIDERS.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>Recent payments</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Provider</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.order_number}</td>
                  <td>{payment.provider || "—"}</td>
                  <td>{payment.method_name || "—"}</td>
                  <td>
                    {formatPrice(payment.amount)} {payment.currency}
                  </td>
                  <td>{payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Finance audit</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Reference</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td>{row.event_type}</td>
                  <td>{row.reference_id || "—"}</td>
                  <td>{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
