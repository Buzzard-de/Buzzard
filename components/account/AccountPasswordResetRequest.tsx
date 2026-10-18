"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/account/client";
import { useLocale } from "@/lib/i18n/context";

export default function AccountPasswordResetRequest() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await requestPasswordReset(email);
    setMessage(t("account.passwordResetSent"));
  }

  return (
    <div className="account-auth">
      <form className="account-auth-card" onSubmit={handleSubmit}>
        <h1>{t("account.forgotPassword")}</h1>
        <label>{t("checkout.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <button type="submit" className="shop-btn-primary">{t("account.sendReset")}</button>
        {message && <p className="admin-message">{message}</p>}
        <p className="account-auth-links"><Link href="/konto/login/">{t("account.loginLink")}</Link></p>
      </form>
    </div>
  );
}
