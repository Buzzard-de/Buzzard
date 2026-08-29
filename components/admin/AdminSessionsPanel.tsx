"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAdminSessions, revokeAdminSession, getAdminToken } from "@/lib/admin/client";

interface SessionRow {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
}

export default function AdminSessionsPanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const rows = await fetchAdminSessions();
    setSessions(rows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleRevoke(sessionId: string) {
    if (!confirm("Session wirklich beenden?")) return;
    await revokeAdminSession(sessionId);
    await reload();
  }

  if (loading) return <p>Lade Sessions…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Session Management</h1>
        <p>Aktive Admin-Sessions — Part 4</p>
      </header>
      {error && <p className="shop-modal-error">{error}</p>}
      <div className="cc-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>User</th>
              <th>Rolle</th>
              <th>Erstellt</th>
              <th>Läuft ab</th>
              <th>IP</th>
              <th>User-Agent</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.sessionId}>
                <td><code>{s.sessionId}</code></td>
                <td>{s.email}</td>
                <td>{s.role}</td>
                <td>{s.createdAt ? new Date(s.createdAt).toLocaleString("de-DE") : "—"}</td>
                <td>{new Date(s.expiresAt).toLocaleString("de-DE")}</td>
                <td>{s.ip || "—"}</td>
                <td className="cc-muted">{(s.userAgent || "—").slice(0, 40)}</td>
                <td>
                  <button type="button" className="shop-btn-secondary" onClick={() => handleRevoke(s.sessionId)}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sessions.length === 0 && <p className="admin-note">Keine aktiven Sessions.</p>}
    </div>
  );
}
