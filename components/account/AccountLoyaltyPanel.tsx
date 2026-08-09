"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  fetchCustomerOffers,
  fetchCrmProfile,
  fetchLoyaltyDashboard,
  redeemLoyaltyReward,
  saveCrmProfile,
} from "@/lib/crmLoyalty/client";
import { shouldUseCrmLoyaltyApi } from "@/lib/crmLoyalty/runtime";
import type { CustomerOffer, LoyaltyLedgerEntry, LoyaltyReward } from "@/lib/crmLoyalty/types";
import { useLocale } from "@/lib/i18n/context";
import { formatPrice } from "@/lib/products";

export default function AccountLoyaltyPanel() {
  const { t } = useLocale();
  const enabled = shouldUseCrmLoyaltyApi();
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState("Bronze");
  const [lifetime, setLifetime] = useState(0);
  const [ledger, setLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingSms, setMarketingSms] = useState(false);
  const [marketingWhatsapp, setMarketingWhatsapp] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [profileData, loyaltyData, offerRows] = await Promise.all([
      fetchCrmProfile(),
      fetchLoyaltyDashboard(),
      fetchCustomerOffers(),
    ]);
    setPoints(Number(loyaltyData.account.points || 0));
    setTier(loyaltyData.account.tier || "Bronze");
    setLifetime(Number(loyaltyData.account.lifetime_points || 0));
    setLedger(loyaltyData.ledger);
    setRewards(loyaltyData.rewards);
    setOffers(offerRows);
    if (profileData.profile) {
      setMarketingEmail(Boolean(profileData.profile.marketing_email));
      setMarketingSms(Boolean(profileData.profile.marketing_sms));
      setMarketingWhatsapp(Boolean(profileData.profile.marketing_whatsapp));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "crmLoyalty.requestFailed"))
      .finally(() => setLoading(false));
  }, [enabled, reload]);

  async function handleSavePrefs(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveCrmProfile({ marketingEmail, marketingSms, marketingWhatsapp });
      setNotice(t("account.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "crmLoyalty.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRedeem(rewardId: number) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await redeemLoyaltyReward(rewardId);
      setNotice(t("account.loyaltyRedeemed").replace("{code}", result.code));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "crmLoyalty.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <div className="account-page">
        <h1>{t("account.loyaltyTitle")}</h1>
        <p>{t("account.loyaltyUnavailable")}</p>
      </div>
    );
  }

  if (loading) return <p>{t("account.loyaltyLoading")}</p>;

  return (
    <div className="account-page">
      <h1>{t("account.loyaltyTitle")}</h1>
      <p className="account-lead">{t("account.loyaltyLead")}</p>

      {error && <p className="shop-modal-error">{error}</p>}
      {notice && <p className="admin-success">{notice}</p>}

      <div className="account-stat-grid">
        <article className="account-stat">
          <strong>{points}</strong>
          <span>{t("account.loyaltyPoints")}</span>
        </article>
        <article className="account-stat">
          <strong>{tier}</strong>
          <span>{t("account.loyaltyTier")}</span>
        </article>
        <article className="account-stat">
          <strong>{lifetime}</strong>
          <span>{t("account.loyaltyLifetime")}</span>
        </article>
      </div>

      <section className="account-panel">
        <h2>{t("account.loyaltyRewards")}</h2>
        {rewards.length === 0 ? (
          <p>{t("account.loyaltyNoRewards")}</p>
        ) : (
          <ul className="account-order-list">
            {rewards.map((reward) => (
              <li key={reward.id}>
                <div>
                  <strong>{reward.title}</strong>
                  <span>
                    {reward.points_cost} {t("account.loyaltyPoints")} ·{" "}
                    {reward.discount_type === "fixed"
                      ? formatPrice(reward.discount_value)
                      : `${reward.discount_value}%`}
                  </span>
                </div>
                <button
                  type="button"
                  className="shop-btn-secondary"
                  disabled={busy || points < reward.points_cost}
                  onClick={() => handleRedeem(reward.id)}
                >
                  {t("account.loyaltyRedeem")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account-panel">
        <h2>{t("account.loyaltyOffers")}</h2>
        {offers.length === 0 ? (
          <p>{t("account.loyaltyNoOffers")}</p>
        ) : (
          <ul className="account-order-list">
            {offers.map((offer) => (
              <li key={offer.id}>
                <strong>{offer.title}</strong>
                <span>{offer.code}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account-panel">
        <h2>{t("account.loyaltyHistory")}</h2>
        {ledger.length === 0 ? (
          <p>{t("account.loyaltyNoHistory")}</p>
        ) : (
          <ul className="account-message-list">
            {ledger.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.points > 0 ? "+" : ""}{entry.points}</strong>
                <span>{entry.reason || entry.reference}</span>
                <small>{entry.created_at}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="account-panel account-form" onSubmit={handleSavePrefs}>
        <h2>{t("account.loyaltyConsent")}</h2>
        <label className="checkout-checkbox">
          <input
            type="checkbox"
            checked={marketingEmail}
            onChange={(e) => setMarketingEmail(e.target.checked)}
          />{" "}
          {t("account.marketingEmails")}
        </label>
        <label className="checkout-checkbox">
          <input
            type="checkbox"
            checked={marketingSms}
            onChange={(e) => setMarketingSms(e.target.checked)}
          />{" "}
          SMS
        </label>
        <label className="checkout-checkbox">
          <input
            type="checkbox"
            checked={marketingWhatsapp}
            onChange={(e) => setMarketingWhatsapp(e.target.checked)}
          />{" "}
          WhatsApp
        </label>
        <button type="submit" className="shop-btn-primary" disabled={busy}>
          {t("account.save")}
        </button>
      </form>
    </div>
  );
}
