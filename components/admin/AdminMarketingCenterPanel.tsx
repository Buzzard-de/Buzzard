"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  createMarketingCampaign,
  fetchMarketingCampaigns,
  fetchMarketingCenterStatus,
  fetchMarketingChannels,
  fetchMarketingProviders,
  fetchMarketingSummary,
  fetchMarketingUtm,
  updateMarketingProvider,
} from "@/lib/marketingCenter/client";
import type {
  MarketingCampaign,
  MarketingCenterStatus,
  MarketingChannelRow,
  MarketingProvider,
  MarketingSummary,
  MarketingUtmRow,
} from "@/lib/marketingCenter/types";
import { formatPrice } from "@/lib/products";

const CHANNELS = ["google_ads", "meta", "tiktok", "ebay", "amazon", "google_shopping"];

export default function AdminMarketingCenterPanel() {
  const [status, setStatus] = useState<MarketingCenterStatus | null>(null);
  const [summary, setSummary] = useState<MarketingSummary | null>(null);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [channels, setChannels] = useState<MarketingChannelRow[]>([]);
  const [utmRows, setUtmRows] = useState<MarketingUtmRow[]>([]);
  const [providers, setProviders] = useState<MarketingProvider[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("google_ads");
  const [budget, setBudget] = useState("1000");
  const [couponCode, setCouponCode] = useState("");

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, summaryRow, campaignRows, channelRows, utm, providerRows] = await Promise.all([
      fetchMarketingCenterStatus(),
      fetchMarketingSummary(),
      fetchMarketingCampaigns(),
      fetchMarketingChannels(),
      fetchMarketingUtm(),
      fetchMarketingProviders(),
    ]);
    setStatus(statusRow);
    setSummary(summaryRow);
    setCampaigns(campaignRows);
    setChannels(channelRows);
    setUtmRows(utm);
    setProviders(providerRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "marketingCenter.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleCreateCampaign() {
    if (!name.trim()) return;
    setMessage("");
    setError("");
    try {
      await createMarketingCampaign({
        name: name.trim(),
        channel,
        budget: Number(budget || 0),
        status: "active",
        couponCode: couponCode.trim() || undefined,
      });
      setName("");
      setCouponCode("");
      setMessage("Kampagne angelegt.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "marketingCenter.requestFailed");
    }
  }

  async function toggleProvider(provider: MarketingProvider) {
    setError("");
    try {
      await updateMarketingProvider(provider.provider, {
        enabled: !provider.enabled,
        accountLabel: provider.account_label || provider.provider,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "marketingCenter.requestFailed");
    }
  }

  if (loading) return <p>Lade Marketing Center…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Marketing & Advertising Center v1.4</h1>
        <p>Kampagnen, UTM-Tracking, Kanal-ROAS und Provider-Grenzen (SQLite)</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-message">{message}</p>}

      {status && (
        <p className="admin-meta">
          Demo: {status.totals.campaigns} Kampagnen · {status.totals.events} Events ·{" "}
          {status.totals.conversions} Conversions
        </p>
      )}

      {summary && (
        <section className="admin-kpi-grid">
          {[
            ["Ad Spend", formatPrice(summary.spend)],
            ["Attributed Revenue", formatPrice(summary.revenue)],
            ["ROAS", summary.roas != null ? `${summary.roas}x` : "—"],
            ["Orders", String(summary.orders)],
            ["Campaigns", String(summary.campaigns)],
            ["Net after Ad Spend", formatPrice(summary.net_after_ad_spend)],
          ].map(([label, value]) => (
            <article key={label} className="admin-kpi">
              <small>{label}</small>
              <strong>{value}</strong>
            </article>
          ))}
        </section>
      )}

      <section className="admin-panel-section">
        <h2>Neue Kampagne</h2>
        <div className="admin-form-grid">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Europe" />
          </label>
          <label>
            Kanal
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Budget (EUR)
            <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" min="0" />
          </label>
          <label>
            Coupon (optional)
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="SUMMER10" />
          </label>
        </div>
        <button type="button" className="shop-btn-primary" onClick={handleCreateCampaign}>
          Kampagne anlegen
        </button>
      </section>

      <div className="admin-two-col">
        <section className="admin-panel-section">
          <h2>Kampagnen</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kanal</th>
                  <th>Status</th>
                  <th>ROAS</th>
                  <th>Revenue</th>
                  <th>UTM</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.name}</strong>
                      {campaign.coupon_code ? <small> · {campaign.coupon_code}</small> : null}
                    </td>
                    <td>{campaign.channel}</td>
                    <td>{campaign.status}</td>
                    <td>{campaign.roas != null ? `${campaign.roas}x` : "—"}</td>
                    <td>{formatPrice(campaign.revenue)}</td>
                    <td>
                      <small>{campaign.utm_source}/{campaign.utm_medium}/{campaign.utm_campaign}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel-section">
          <h2>Kanäle</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Kanal</th>
                  <th>Spend</th>
                  <th>Revenue</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((row) => (
                  <tr key={row.channel}>
                    <td>{row.channel}</td>
                    <td>{formatPrice(row.spend)}</td>
                    <td>{formatPrice(row.revenue)}</td>
                    <td>{row.roas != null ? `${row.roas}x` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="admin-panel-section">
        <h2>UTM Events</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Medium</th>
                <th>Campaign</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody>
              {utmRows.map((row) => (
                <tr key={`${row.source}-${row.medium}-${row.campaign}`}>
                  <td>{row.source}</td>
                  <td>{row.medium}</td>
                  <td>{row.campaign}</td>
                  <td>{row.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel-section">
        <h2>Provider Connections</h2>
        <p className="admin-meta">Adapter-Grenzen für Google Ads, Meta, TikTok, eBay, Amazon, Google Shopping</p>
        <div className="admin-provider-grid">
          {providers.map((provider) => (
            <div key={provider.provider} className="admin-provider-card">
              <div>
                <strong>{provider.provider}</strong>
                <small>{provider.enabled ? "CONNECTED" : "NOT CONFIGURED"}</small>
              </div>
              <button type="button" className="shop-btn-secondary" onClick={() => toggleProvider(provider)}>
                {provider.enabled ? "Deaktivieren" : "Aktivieren (Demo)"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
