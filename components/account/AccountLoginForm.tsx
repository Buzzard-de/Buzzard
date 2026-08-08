"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/lib/account/context";
import { useLocale } from "@/lib/i18n/context";

export default function AccountLoginForm() {
  const router = useRouter();
  const { login } = useAccount();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/konto/");
    } catch {
      setError(t("account.auth.invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="account-auth">
      <form className="account-auth-card" onSubmit={handleSubmit}>
        <h1>{t("account.loginTitle")}</h1>
        <label>{t("checkout.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>{t("account.password")}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="shop-modal-error">{error}</p>}
        <button type="submit" className="shop-btn-primary" disabled={loading}>{loading ? "…" : t("account.login")}</button>
        <p className="account-auth-links">
          <Link href="/konto/registrieren/">{t("account.registerLink")}</Link>
          {" · "}
          <Link href="/konto/passwort-vergessen/">{t("account.forgotPassword")}</Link>
        </p>
        <p className="account-login-hint">Demo: kunde@buzzard.de / BuzzardKunde2026!</p>
      </form>
    </div>
  );
}
