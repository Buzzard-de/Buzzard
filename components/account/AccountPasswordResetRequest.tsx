"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/account/client";
import { useLocale } from "@/lib/i18n/context";

export default function AccountPasswordResetRequest() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await requestPasswordReset(email);
    setMessage(t("account.passwordResetSent"));
    if (result.resetToken) {
      setToken(result.resetToken);
    }
  }

  return (
    <div className="account-auth">
      <form className="account-auth-card" onSubmit={handleSubmit}>
        <h1>{t("account.forgotPassword")}</h1>
        <label>{t("checkout.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <button type="submit" className="shop-btn-primary">{t("account.sendReset")}</button>
        {message && <p className="admin-message">{message}</p>}
        {token && (
          <p className="account-login-hint">
            Demo-Token: <Link href={`/konto/passwort-zuruecksetzen/?token=${encodeURIComponent(token)}`}>{t("account.resetLink")}</Link>
          </p>
        )}
        <p className="account-auth-links"><Link href="/konto/login/">{t("account.loginLink")}</Link></p>
      </form>
    </div>
  );
}
