"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { confirmPasswordReset } from "@/lib/account/client";
import { useLocale } from "@/lib/i18n/context";

function ResetConfirmInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await confirmPasswordReset({ token, password, passwordConfirm });
      router.push("/konto/login/");
    } catch {
      setError(t("account.passwordReset.invalidToken"));
    }
  }

  return (
    <div className="account-auth">
      <form className="account-auth-card" onSubmit={handleSubmit}>
        <h1>{t("account.resetPasswordTitle")}</h1>
        <label>{t("account.password")}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
        <label>{t("account.passwordConfirm")}<input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required /></label>
        {error && <p className="shop-modal-error">{error}</p>}
        <button type="submit" className="shop-btn-primary">{t("account.savePassword")}</button>
        <p className="account-auth-links"><Link href="/konto/login/">{t("account.loginLink")}</Link></p>
      </form>
    </div>
  );
}

export default function AccountPasswordResetConfirm() {
  return (
    <Suspense fallback={<div className="account-loading">…</div>}>
      <ResetConfirmInner />
    </Suspense>
  );
}
