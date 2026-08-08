"use client";

import { useEffect, useState } from "react";
import { fetchAutomationEvents } from "@/lib/ai/client";
import type { AutomationEvent, AutomationStats } from "@/lib/ai/types";
import { getAdminToken } from "@/lib/admin/client";

export default function AdminAutomationPanel() {
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    fetchAutomationEvents(token, 80)
      .then((data) => {
        setEvents(data.events);
        setStats(data.stats);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Automation wird geladen…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <div className="admin-automation">
      <header className="admin-page-header">
        <h1>Automation & KI</h1>
        <p>Event-gesteuerte Benachrichtigungen, KI-Chat und Empfehlungen</p>
      </header>

      {stats ? (
        <section className="admin-stat-grid">
          <article className="admin-stat">
            <strong>{stats.total}</strong>
            <span>Events gesamt</span>
          </article>
          <article className="admin-stat">
            <strong>{stats.deliveries}</strong>
            <span>Idempotente Zustellungen</span>
          </article>
          <article className="admin-stat">
            <strong>{Object.keys(stats.byType).length}</strong>
            <span>Event-Typen</span>
          </article>
        </section>
      ) : null}

      <section className="admin-panel">
        <h2>Letzte Automation-Events</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.createdAt).toLocaleString("de-DE")}</td>
                  <td>{event.type}</td>
                  <td>{event.status}</td>
                  <td>
                    <code>{JSON.stringify(event.payload).slice(0, 120)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
