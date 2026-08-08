"use client";

import { FormEvent, useEffect, useState } from "react";
import { requestAccountDeletion, updateAccountPreferences } from "@/lib/account/client";
import { useLocale } from "@/lib/i18n/context";

export default function AccountSettingsForm() {
  const { t } = useLocale();
  const [marketing, setMarketing] = useState(false);
  const [transactional, setTransactional] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    import("@/lib/account/client").then(({ fetchAccountMe }) =>
      fetchAccountMe().then((me) => {
        setMarketing(Boolean(me.preferences.marketing));
        setTransactional(me.preferences.transactional !== false);
      })
    );
  }, []);

  async function savePreferences(e: FormEvent) {
    e.preventDefault();
    await updateAccountPreferences({ marketing, transactional });
    setMessage(t("account.saved"));
  }

  async function requestDeletion() {
    const requestedAt = await requestAccountDeletion();
    setMessage(t("account.deletionRequested").replace("{date}", new Date(requestedAt).toLocaleString("de-DE")));
  }

  return (
    <div className="account-page">
      <h1>{t("account.settingsTitle")}</h1>
      <form className="account-panel account-form" onSubmit={savePreferences}>
        <h2>{t("account.notifications")}</h2>
        <label className="checkout-checkbox"><input type="checkbox" checked={transactional} onChange={(e) => setTransactional(e.target.checked)} /> {t("account.transactionalEmails")}</label>
        <label className="checkout-checkbox"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> {t("account.marketingEmails")}</label>
        <button type="submit" className="shop-btn-primary">{t("account.save")}</button>
      </form>
      <section className="account-panel">
        <h2>{t("account.privacyTitle")}</h2>
        <p>{t("account.privacyText")}</p>
        <button type="button" className="shop-btn-secondary" onClick={requestDeletion}>{t("account.requestDeletion")}</button>
      </section>
      {message && <p className="admin-message">{message}</p>}
    </div>
  );
}
