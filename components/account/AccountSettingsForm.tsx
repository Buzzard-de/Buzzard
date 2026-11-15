"use client";

import { FormEvent, useEffect, useState } from "react";
import { requestAccountDeletion, updateAccountPreferences } from "@/lib/account/client";
import { useLocale } from "@/lib/i18n/context";

export default function AccountSettingsForm() {
  const { t } = useLocale();
  const [marketing, setMarketing] = useState(false);
  const [emailStatus, setEmailStatus] = useState("UNKNOWN");
  const [whatsappStatus, setWhatsappStatus] = useState("UNKNOWN");
  const [transactional, setTransactional] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    import("@/lib/account/client").then(({ fetchAccountMe }) =>
      fetchAccountMe().then((me) => {
        const verifiedGrant = me.granted === true && me.consentVerified === true && me.emailPermission === "GRANTED";
        setMarketing(verifiedGrant);
        setEmailStatus(me.emailPermission || "UNKNOWN");
        setWhatsappStatus(me.whatsappPermission || "UNKNOWN");
        setTransactional(me.preferences?.transactional !== false);
      })
    );
  }, []);

  async function savePreferences(e: FormEvent) {
    e.preventDefault();
    await updateAccountPreferences({ transactional });
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
        <label className="checkout-checkbox"><input type="checkbox" checked={marketing} disabled readOnly /> {t("account.marketingEmails")} {emailStatus}</label>
        <p>WhatsApp {whatsappStatus}</p>
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
