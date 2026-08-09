"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchMarketplaceChannelOrders,
  fetchMarketplaceHubStatus,
  fetchMarketplaces,
  fetchMarketplaceSyncJobs,
  queueMarketplaceSync,
  updateMarketplace,
} from "@/lib/marketplaceHub/client";
import type {
  MarketplaceChannel,
  MarketplaceChannelOrder,
  MarketplaceHubStatus,
  MarketplaceSyncJob,
} from "@/lib/marketplaceHub/types";
import { formatPrice } from "@/lib/products";

export default function AdminMarketplaceHubPanel() {
  const [status, setStatus] = useState<MarketplaceHubStatus | null>(null);
  const [marketplaces, setMarketplaces] = useState<MarketplaceChannel[]>([]);
  const [jobs, setJobs] = useState<MarketplaceSyncJob[]>([]);
  const [orders, setOrders] = useState<MarketplaceChannelOrder[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, marketplaceRows, jobRows, orderRows] = await Promise.all([
      fetchMarketplaceHubStatus(),
      fetchMarketplaces(),
      fetchMarketplaceSyncJobs(),
      fetchMarketplaceChannelOrders(),
    ]);
    setStatus(statusRow);
    setMarketplaces(marketplaceRows);
    setJobs(jobRows);
    setOrders(orderRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "marketplaceHub.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleSync(type: "stock" | "prices" | "orders") {
    setMessage("");
    setError("");
    try {
      const result = await queueMarketplaceSync(type);
      setMessage(`${type} sync queued: ${result.queued}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "marketplaceHub.requestFailed");
    }
  }

  async function toggleMarketplace(marketplace: MarketplaceChannel) {
    setError("");
    try {
      await updateMarketplace(marketplace.code, {
        enabled: !marketplace.enabled,
        accountLabel: marketplace.account_label || marketplace.name,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "marketplaceHub.requestFailed");
    }
  }

  if (loading) return <p>Lade Marketplace Hub…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Marketplace Hub v1.5</h1>
        <p>Multi-Channel Listings, Sync-Queues, Order-Import und Channel Health (SQLite)</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-message">{message}</p>}

      {status && (
        <>
          <section className="admin-kpi-grid">
            {[
              ["Marketplaces", String(status.totals.marketplaces)],
              ["Listings", String(status.totals.listings)],
              ["Sync Jobs", String(status.totals.syncJobs)],
              ["Queued", String(status.totals.queuedJobs)],
              ["Channel Orders", String(status.totals.channelOrders)],
            ].map(([label, value]) => (
              <article key={label} className="admin-kpi">
                <small>{label}</small>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
          <p className="admin-meta">
            Adapter-Grenzen: Amazon, eBay, Google Shopping, TikTok Shop
          </p>
        </>
      )}

      <section className="admin-panel-section">
        <h2>Marketplace Connections</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Status</th>
                <th>Listings</th>
                <th>Queued Jobs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {marketplaces.map((marketplace) => (
                <tr key={marketplace.code}>
                  <td>
                    <strong>{marketplace.name}</strong>
                    <small> · {marketplace.code}</small>
                  </td>
                  <td>{marketplace.status}</td>
                  <td>{marketplace.listings}</td>
                  <td>{marketplace.queuedJobs}</td>
                  <td>
                    <button
                      type="button"
                      className="shop-btn-secondary"
                      onClick={() => toggleMarketplace(marketplace)}
                    >
                      {marketplace.enabled ? "Trennen" : "Verbinden (Demo)"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel-section">
        <h2>Synchronization</h2>
        <div className="admin-form-grid">
          <button type="button" className="shop-btn-primary" onClick={() => handleSync("stock")}>
            Sync Stock
          </button>
          <button type="button" className="shop-btn-primary" onClick={() => handleSync("prices")}>
            Sync Prices
          </button>
          <button type="button" className="shop-btn-primary" onClick={() => handleSync("orders")}>
            Import Orders
          </button>
        </div>
      </section>

      <div className="admin-two-col">
        <section className="admin-panel-section">
          <h2>Recent Sync Jobs</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Type</th>
                  <th>Entity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 20).map((job) => (
                  <tr key={job.id}>
                    <td>{job.marketplace}</td>
                    <td>{job.job_type}</td>
                    <td>{job.entity_key}</td>
                    <td>{job.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel-section">
          <h2>Imported Channel Orders</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>External ID</th>
                  <th>Internal</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.marketplace}</td>
                    <td>{order.external_order_id}</td>
                    <td>{order.internal_order_number || "—"}</td>
                    <td>{formatPrice(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
