"use client";

import { FormEvent, useState } from "react";
import { updateAccountProfile } from "@/lib/account/client";
import { useAccount } from "@/lib/account/context";
import { useLocale } from "@/lib/i18n/context";

export default function AccountProfileForm() {
  const { user, refresh } = useAccount();
  const { t } = useLocale();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    country: user?.country || "DE",
  });
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await updateAccountProfile(form);
    await refresh();
    setMessage(t("account.saved"));
  }

  return (
    <div className="account-page">
      <h1>{t("account.profileTitle")}</h1>
      <form className="account-panel account-form" onSubmit={handleSubmit}>
        <label>{t("checkout.email")}<input value={user?.email || ""} disabled /></label>
        <div className="checkout-row">
          <label>{t("checkout.firstName")}<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
          <label>{t("checkout.lastName")}<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label>
        </div>
        <label>{t("checkout.phone")}<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <button type="submit" className="shop-btn-primary">{t("account.save")}</button>
        {message && <p className="admin-message">{message}</p>}
      </form>
    </div>
  );
}
