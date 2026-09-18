"use client";

import { useEffect, useState } from "react";
import { fetchPaymentProductionDashboard, fetchPaymentProductionStatusReport } from "@/lib/payment-production/adminClient";
import type { PaymentProductionDashboard, PaymentProductionStatusReport } from "@/lib/payment-production/types";

export default function AdminPaymentProductionPanel() {
  const [dashboard, setDashboard] = useState<PaymentProductionDashboard | null>(null);
  const [providers, setProviders] = useState<Record<string, { status: string; enabled: boolean }>>({});
  const [report, setReport] = useState<PaymentProductionStatusReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [dash, rep] = await Promise.all([
        fetchPaymentProductionDashboard(),
        fetchPaymentProductionStatusReport(),
      ]);
      if (dash) {
        setDashboard(dash.data);
        setProviders(dash.providers);
      }
      if (rep) setReport(rep);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) return <p>Loading payment production…</p>;

  return (
    <div className="admin-panel">
      <h1>Payment Production (#350)</h1>
      <p>Multi-provider checkout — metadata only, no secret values.</p>

      {dashboard && (
        <section>
          <h2>Overview</h2>
          <ul>
            <li>Version: {dashboard.version}</li>
            <li>Production: {dashboard.productionEnabled}</li>
            <li>Live status: {dashboard.liveStatus}</li>
            <li>Default provider: {dashboard.defaultProvider}</li>
            <li>Real charges: {dashboard.safetyCounters.realCharges}</li>
            <li>Real refunds: {dashboard.safetyCounters.realRefunds}</li>
          </ul>
        </section>
      )}

      <section>
        <h2>Providers</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Status</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(providers).map(([name, info]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{info.status}</td>
                <td>{info.enabled ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {dashboard && (
        <section>
          <h2>Safety Gates</h2>
          <ul>
            <li>Webhook Security: {dashboard.webhookSecurity}</li>
            <li>Idempotency: {dashboard.idempotency}</li>
            <li>Refund: {dashboard.refund}</li>
            <li>Fraud/Risk: {dashboard.fraudRisk}</li>
          </ul>
        </section>
      )}

      {report && (
        <section>
          <h2>Status Report</h2>
          <pre>{JSON.stringify(report.sections, null, 2)}</pre>
          <p>
            SOFTWARE = {report.software} · PAYMENT = {report.payment} · SALES ={" "}
            {report.sales === "CLOSED" ? "CLOSED" : report.sales}
          </p>
          <p>REAL PAYMENT SIDE EFFECTS: {report.realPaymentSideEffects}</p>
        </section>
      )}
    </div>
  );
}
