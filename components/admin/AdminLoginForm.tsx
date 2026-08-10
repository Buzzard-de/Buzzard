"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { adminLogin } from "@/lib/admin/client";
import { isProductionBuild } from "@/lib/api/config";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@buzzard.de");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await adminLogin(
        email,
        password,
        challengeToken ? totpCode : undefined,
        challengeToken || undefined
      );
      if (result.requires2FA && result.challengeToken) {
        setChallengeToken(result.challengeToken);
        setTotpCode("");
        return;
      }
      router.push("/admin/");
    } catch (err) {
      if (err instanceof Error && err.message === "admin.apiUnavailable") {
        setError("Admin-Service derzeit nicht erreichbar. Bitte später erneut versuchen.");
      } else if (err instanceof Error && err.message === "admin.auth.locked") {
        setError("Konto vorübergehend gesperrt. Bitte in 30 Minuten erneut versuchen.");
      } else if (err instanceof Error && err.message === "admin.auth.rateLimited") {
        setError("Zu viele Versuche. Bitte später erneut versuchen.");
      } else if (challengeToken) {
        setError("Ungültiger 2FA-Code. Bitte erneut versuchen.");
      } else {
        setError("Anmeldung fehlgeschlagen. E-Mail oder Passwort ungültig.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <h1>Buzzard Admin</h1>
        <p>{challengeToken ? "Zwei-Faktor-Authentifizierung" : "Lieferanten- & Katalogverwaltung"}</p>

        {!challengeToken ? (
          <>
            <label htmlFor="email">E-Mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            <p className="admin-login-hint">Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.</p>
            <label htmlFor="totp">2FA-Code</label>
            <input
              id="totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            <button
              type="button"
              className="shop-btn-secondary"
              onClick={() => {
                setChallengeToken(null);
                setTotpCode("");
                setError("");
              }}
            >
              Zurück
            </button>
          </>
        )}

        {error && <p className="shop-modal-error">{error}</p>}
        <button type="submit" className="shop-btn-primary" disabled={loading}>
          {loading ? "Anmelden…" : challengeToken ? "Code bestätigen" : "Anmelden"}
        </button>
        {!isProductionBuild() && !challengeToken ? (
          <p className="admin-login-hint">Demo: admin@buzzard.de / BuzzardAdmin2026!</p>
        ) : null}
      </form>
    </div>
  );
}
