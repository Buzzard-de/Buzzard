"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  adminEarnPoints,
  fetchAdminAbandonedCarts,
  fetchAdminCrmLoyaltyStatus,
  fetchAdminLoyaltyAccounts,
  fetchAdminOffers,
  fetchAdminSegments,
  queueRecoveryCampaigns,
} from "@/lib/crmLoyalty/client";
import type {
  AbandonedCartRecord,
  CrmLoyaltyStatus,
  CustomerOffer,
  CustomerSegment,
  LoyaltyAccount,
} from "@/lib/crmLoyalty/types";

export default function AdminCrmLoyaltyPanel() {
  const [status, setStatus] = useState<CrmLoyaltyStatus | null>(null);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [carts, setCarts] = useState<AbandonedCartRecord[]>([]);
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [earnUserId, setEarnUserId] = useState("1");
  const [earnPoints, setEarnPointsValue] = useState("100");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, segmentRows, cartRows, offerRows, accountRows] = await Promise.all([
      fetchAdminCrmLoyaltyStatus(),
      fetchAdminSegments(),
      fetchAdminAbandonedCarts(),
      fetchAdminOffers(),
      fetchAdminLoyaltyAccounts(),
    ]);
    setStatus(statusRow);
    setSegments(segmentRows);
    setCarts(cartRows);
    setOffers(offerRows);
    setAccounts(accountRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "crmLoyalty.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleQueueRecovery() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await queueRecoveryCampaigns("email");
      setMessage(`${result.queued} Recovery-Kampagnen in Queue`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "crmLoyalty.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleEarnPoints(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await adminEarnPoints({
        userId: Number(earnUserId),
        points: Number(earnPoints),
        reason: "admin credit",
      });
      setMessage(`${earnPoints} Punkte für User ${earnUserId} gutgeschrieben`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "crmLoyalty.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Lade CRM & Loyalty…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>CRM & Loyalty v1.2</h1>
        <p>Profile, Punkte, Segmente, Angebote und Warenkorb-Recovery</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      {status && (
        <section className="admin-card">
          <h2>Status</h2>
          <ul className="admin-stats">
            <li>CRM-Profile: {status.totals.crmProfiles}</li>
            <li>Loyalty-Konten: {status.totals.loyaltyAccounts}</li>
            <li>Rewards: {status.totals.rewards}</li>
            <li>Segmente: {status.totals.segments}</li>
            <li>Aktive Offers: {status.totals.offers}</li>
            <li>Offene Carts: {status.totals.abandonedCarts}</li>
            <li>Recovery-Kampagnen: {status.totals.recoveryCampaigns}</li>
          </ul>
          <button type="button" className="shop-btn-primary" disabled={busy} onClick={handleQueueRecovery}>
            Recovery-Kampagnen queuen (24h+)
          </button>
        </section>
      )}

      <section className="admin-card">
        <h2>Punkte gutschreiben</h2>
        <form className="admin-form" onSubmit={handleEarnPoints}>
          <label>
            User-ID
            <input value={earnUserId} onChange={(e) => setEarnUserId(e.target.value)} required />
          </label>
          <label>
            Punkte
            <input value={earnPoints} onChange={(e) => setEarnPointsValue(e.target.value)} required />
          </label>
          <button type="submit" className="shop-btn-secondary" disabled={busy}>
            Gutschreiben
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Segmente</h2>
        <ul>
          {segments.map((segment) => (
            <li key={segment.id}>
              <strong>{segment.name}</strong> — {segment.description}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Abandoned Carts</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Subtotal</th>
              <th>Items</th>
              <th>Status</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {carts.map((cart) => (
              <tr key={cart.id}>
                <td>{cart.user_id}</td>
                <td>{cart.subtotal.toFixed(2)} {cart.currency}</td>
                <td>{cart.item_count}</td>
                <td>{cart.status}</td>
                <td>{cart.last_seen_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>Top Loyalty Accounts</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Punkte</th>
              <th>Lifetime</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.user_id}>
                <td>{account.user_id}</td>
                <td>{account.points}</td>
                <td>{account.lifetime_points}</td>
                <td>{account.tier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>Personalized Offers</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Title</th>
              <th>Code</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td>{offer.user_id}</td>
                <td>{offer.title}</td>
                <td>{offer.code}</td>
                <td>{offer.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
