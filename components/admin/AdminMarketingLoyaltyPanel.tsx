"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchMarketingCampaigns,
  fetchMarketingLoyaltyOverview,
  fetchMarketingLoyaltyStatus,
} from "@/lib/marketingLoyalty/client";
import type {
  MarketingCampaignRow,
  MarketingLoyaltyOverview,
  MarketingLoyaltyStatus,
} from "@/lib/marketingLoyalty/types";

const ARCHITECTURE = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Points ledger",
  "Referral rewards",
  "Customer segments",
  "Email campaigns",
  "SMS campaigns",
  "Personalized promotions",
  "GDPR consent",
];

export default function AdminMarketingLoyaltyPanel() {
  const [status, setStatus] = useState<MarketingLoyaltyStatus | null>(null);
  const [overview, setOverview] = useState<MarketingLoyaltyOverview | null>(null);
  const [campaigns, setCampaigns] = useState<MarketingCampaignRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, campaignRows] = await Promise.all([
      fetchMarketingLoyaltyStatus(),
      fetchMarketingLoyaltyOverview(),
      fetchMarketingCampaigns(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setCampaigns(campaignRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "marketingLoyalty.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Marketing & Loyalty…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Marketing & Loyalty v2.6</h1>
        <p>Campaigns, coupons, loyalty tiers, referrals and marketing consent</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Campaigns", overview.campaigns],
            ["Active", overview.activeCampaigns],
            ["Promotion uses", overview.promotionUses],
            ["Loyalty customers", overview.loyaltyCustomers],
            ["Points balance", overview.loyaltyPoints],
            ["Referrals", overview.referrals],
            ["Completed", overview.completedReferrals],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <div className="admin-toolbar">
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Refresh
          </button>
        </div>

        <h2>Campaigns</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Audience</th>
                <th>Discount</th>
                <th>Channel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.code}</strong>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.audience_segment}</td>
                  <td>
                    {row.discount_value}
                    {row.discount_type === "percent" ? "%" : " €"}
                  </td>
                  <td>{row.channel}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Loyalty architecture</h2>
        <div className="admin-flow">
          {ARCHITECTURE.map((item) => (
            <span key={item} className="admin-tag">
              {item}
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · handoff to v2.0 identity/consent, v2.4 CRM segments, v2.1 order totals
          </p>
        </section>
      )}
    </div>
  );
}
