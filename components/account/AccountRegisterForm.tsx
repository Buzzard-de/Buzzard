"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/lib/account/context";
import { useLocale } from "@/lib/i18n/context";
import { CHECKOUT_COUNTRIES } from "@/lib/checkout/countries";

export default function AccountRegisterForm() {
  const router = useRouter();
  const { register } = useAccount();
  const { t } = useLocale();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    country: "DE",
    acceptTerms: false,
    marketing: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push("/konto/");
    } catch (err) {
      setError(t(String(err instanceof Error ? err.message : "account.register.failed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="account-auth">
      <form className="account-auth-card" onSubmit={handleSubmit}>
        <h1>{t("account.registerTitle")}</h1>
        <div className="checkout-row">
          <label>{t("checkout.firstName")}<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
          <label>{t("checkout.lastName")}<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label>
        </div>
        <label>{t("checkout.email")}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>{t("checkout.country")}
          <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {CHECKOUT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{t(c.labelKey)}</option>)}
          </select>
        </label>
        <label>{t("account.password")}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /></label>
        <label>{t("account.passwordConfirm")}<input type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} required /></label>
        <label className="checkout-checkbox"><input type="checkbox" checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} required /> {t("account.acceptTerms")}</label>
        <label className="checkout-checkbox"><input type="checkbox" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} /> {t("account.marketingOptIn")}</label>
        {error && <p className="shop-modal-error">{error}</p>}
        <button type="submit" className="shop-btn-primary" disabled={loading}>{t("account.registerAction")}</button>
        <p className="account-auth-links"><Link href="/konto/login/">{t("account.loginLink")}</Link></p>
      </form>
    </div>
  );
}
