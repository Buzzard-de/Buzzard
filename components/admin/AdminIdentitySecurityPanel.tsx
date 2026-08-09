"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchIdentityAccount,
  fetchIdentitySecurityAudit,
  fetchIdentitySecurityOverview,
  fetchIdentitySecurityStatus,
  fetchIdentitySessions,
} from "@/lib/identitySecurity/client";
import type {
  IdentityAccount,
  IdentitySecurityAuditEvent,
  IdentitySecurityOverview,
  IdentitySecurityStatus,
  IdentitySessionRow,
} from "@/lib/identitySecurity/types";

const FEATURES = [
  "Password hashing (scrypt)",
  "Access + refresh sessions",
  "Role-based access",
  "Address book",
  "Email verification",
  "Password reset",
  "2FA/TOTP boundary",
  "GDPR export/delete requests",
  "Security audit log",
  "Login attempt tracking",
];

export default function AdminIdentitySecurityPanel() {
  const [status, setStatus] = useState<IdentitySecurityStatus | null>(null);
  const [overview, setOverview] = useState<IdentitySecurityOverview | null>(null);
  const [account, setAccount] = useState<IdentityAccount | null>(null);
  const [audit, setAudit] = useState<IdentitySecurityAuditEvent[]>([]);
  const [sessions, setSessions] = useState<IdentitySessionRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, accountRow, auditRows, sessionRows] = await Promise.all([
      fetchIdentitySecurityStatus(),
      fetchIdentitySecurityOverview(),
      fetchIdentityAccount(),
      fetchIdentitySecurityAudit(),
      fetchIdentitySessions(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setAccount(accountRow);
    setAudit(auditRows);
    setSessions(sessionRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "identitySecurity.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Identity & Security…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Identity & Security v2.0</h1>
        <p>Accounts, Sessions, Audit-Log, 2FA-Boundary und GDPR Privacy Requests</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Users", String(overview.users)],
            ["Verified", String(overview.verified)],
            ["Active sessions", String(overview.activeSessions)],
            ["Failed logins 24h", String(overview.failedLogins24h)],
            ["Privacy requests", String(overview.privacyRequests)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      {status && (
        <section className="admin-kpi-grid">
          {[
            ["Audit events", String(status.totals.auditEvents)],
            ["Addresses", String(status.totals.addresses)],
            ["Access token", `${status.accessTokenMinutes}m`],
            ["Refresh token", `${status.refreshTokenDays}d`],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      {account && (
        <section className="admin-card">
          <h2>Current account</h2>
          <p>
            <strong>
              {account.firstName} {account.lastName}
            </strong>
          </p>
          <p>{account.email}</p>
          <div className="admin-tags">
            <span>{account.role}</span>
            <span>{account.emailVerified ? "Email verified" : "Email not verified"}</span>
            <span>{account.twofaEnabled ? "2FA enabled" : "2FA not enabled"}</span>
          </div>
        </section>
      )}

      <section className="admin-card">
        <h2>Security architecture</h2>
        <ul className="admin-list">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Audit log</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>User</th>
                <th>IP hash</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td>{row.event_type}</td>
                  <td>{row.user_id || "—"}</td>
                  <td>{row.ip_hash.slice(0, 12)}…</td>
                  <td>{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Sessions</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Agent</th>
                <th>Expires</th>
                <th>Revoked</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td>{row.user_id}</td>
                  <td>{(row.user_agent || "—").slice(0, 40)}</td>
                  <td>{row.expires_at}</td>
                  <td>{row.revoked ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
