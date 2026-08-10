"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disableAdminTwoFactor,
  enableAdminTwoFactor,
  fetchSecurityDashboard,
  fetchAdminTwoFactorStatus,
  getAdminToken,
  setupAdminTwoFactor,
} from "@/lib/admin/client";
import type { LockoutEntry, SecurityEvent, SecurityOverview } from "@/lib/admin/securityTypes";

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE");
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    admin_login: "Admin Login OK",
    admin_login_failed: "Admin Login fehlgeschlagen",
    admin_login_2fa_required: "2FA angefordert",
    admin_login_2fa_failed: "2FA fehlgeschlagen",
    admin_login_locked: "Login gesperrt",
    admin_login_rate_limited: "Rate Limit",
    admin_account_locked: "Konto gesperrt",
    admin_logout: "Admin Logout",
    auth_login_failed: "Kunden-Login fehlgeschlagen",
    auth_account_locked: "Kundenkonto gesperrt",
    api_rate_limited: "API Rate Limit",
  };
  return labels[type] || type;
}

export default function AdminSecurityDashboardPanel() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [lockouts, setLockouts] = useState<LockoutEntry[]>([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupUri, setSetupUri] = useState("");
  const [enableCode, setEnableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [dashboard, twoFactor] = await Promise.all([fetchSecurityDashboard(), fetchAdminTwoFactorStatus()]);
    setOverview(dashboard.overview);
    setEvents(dashboard.events);
    setLockouts(dashboard.lockouts);
    setTwoFactorEnabled(twoFactor.enabled);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "admin.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleSetup2FA() {
    setMessage("");
    setError("");
    try {
      const setup = await setupAdminTwoFactor();
      setSetupSecret(setup.secret);
      setSetupUri(setup.otpauthUri);
      setMessage("Secret generiert. Scannen Sie den otpauth-Link in Ihrer Authenticator-App.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "admin.requestFailed");
    }
  }

  async function handleEnable2FA() {
    setMessage("");
    setError("");
    try {
      await enableAdminTwoFactor(enableCode);
      setTwoFactorEnabled(true);
      setSetupSecret("");
      setSetupUri("");
      setEnableCode("");
      setMessage("2FA ist jetzt aktiv.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "admin.2fa.invalidCode");
    }
  }

  async function handleDisable2FA() {
    setMessage("");
    setError("");
    try {
      await disableAdminTwoFactor(disablePassword, disableCode);
      setTwoFactorEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setMessage("2FA wurde deaktiviert.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "admin.requestFailed");
    }
  }

  if (loading) return <p>Lade Security Dashboard…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Security Dashboard</h1>
        <p>Security-Events, Account-Lockouts und Admin-2FA</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-login-hint">{message}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Events (24h)", String(overview.totalEvents24h)],
            ["Fehlversuche (24h)", String(overview.failedLogins24h)],
            ["Admin-Fehler (24h)", String(overview.adminFailures24h)],
            ["Rate Limits (24h)", String(overview.rateLimited24h)],
            ["Admin Logins OK", String(overview.successfulAdminLogins24h)],
            ["Aktive Sperren", String(overview.lockoutsActive)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <h2>Admin 2FA (TOTP)</h2>
        <p>Status: {twoFactorEnabled ? "Aktiv" : "Inaktiv"}</p>
        {!twoFactorEnabled ? (
          <>
            <button type="button" className="shop-btn-primary" onClick={handleSetup2FA}>
              2FA einrichten
            </button>
            {setupSecret && (
              <div style={{ marginTop: "1rem" }}>
                <p>
                  <strong>Secret:</strong> <code>{setupSecret}</code>
                </p>
                <p>
                  <strong>otpauth:</strong> <code>{setupUri}</code>
                </p>
                <label htmlFor="enableCode">Bestätigungscode</label>
                <input
                  id="enableCode"
                  value={enableCode}
                  onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                />
                <button type="button" className="shop-btn-primary" onClick={handleEnable2FA}>
                  2FA aktivieren
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: "1rem" }}>
            <label htmlFor="disablePassword">Passwort</label>
            <input
              id="disablePassword"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            <label htmlFor="disableCode">2FA-Code</label>
            <input
              id="disableCode"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
            />
            <button type="button" className="shop-btn-secondary" onClick={handleDisable2FA}>
              2FA deaktivieren
            </button>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>Aktive Lockouts</h2>
        {lockouts.length === 0 ? (
          <p>Keine gesperrten Konten.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Konto</th>
                <th>Fehler</th>
                <th>Status</th>
                <th>Letzter Fehler</th>
              </tr>
            </thead>
            <tbody>
              {lockouts.map((entry) => (
                <tr key={entry.key}>
                  <td>{entry.key}</td>
                  <td>{entry.failures}</td>
                  <td>{entry.locked ? "Gesperrt" : "Beobachtet"}</td>
                  <td>{formatTime(entry.lastFailure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-card">
        <h2>Letzte Security-Events</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Typ</th>
              <th>IP</th>
              <th>E-Mail</th>
              <th>OK</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 50).map((event) => (
              <tr key={event.id}>
                <td>{formatTime(event.timestamp)}</td>
                <td>{eventLabel(event.type)}</td>
                <td>{event.ip || "—"}</td>
                <td>{event.email || "—"}</td>
                <td>{event.success ? "Ja" : "Nein"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
