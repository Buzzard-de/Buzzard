"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import { apiBaseUrl } from "@/lib/api/config";

interface SubmissionRow {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export default function AdminContactSubmissionsPanel() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const base = apiBaseUrl();
    if (!base) throw new Error("API nicht konfiguriert");

    const token = getAdminToken();
    const res = await fetch(`${base}/api/submissions`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = (await res.json()) as { submissions?: SubmissionRow[]; message?: string };
    if (!res.ok) throw new Error(data.message || "Kontaktanfragen konnten nicht geladen werden");
    setRows(data.submissions || []);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "Fehler beim Laden"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Kontaktanfragen…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Kontaktanfragen</h1>
        <p>Formular-Eingänge von der Website (JSON-Store auf der API)</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      <section className="admin-card">
        <div className="admin-toolbar">
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Refresh
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Nachricht</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4}>Keine Anfragen — API muss live sein und Formular genutzt werden.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.createdAt}</td>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td>{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
