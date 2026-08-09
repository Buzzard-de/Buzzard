"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { fetchAutomationEvents } from "@/lib/ai/client";
import type { AutomationEvent, AutomationStats } from "@/lib/ai/types";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchAutomationJobs,
  fetchIntegrationEvents,
  fetchOrderAutomationStatus,
  queueOrderAutomation,
  retryAutomationJob,
} from "@/lib/orderAutomation/client";
import type { AutomationJob, IntegrationEventRow, OrderAutomationStatus } from "@/lib/orderAutomation/types";

export default function AdminAutomationPanel() {
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [orchestration, setOrchestration] = useState<OrderAutomationStatus | null>(null);
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [integrationEvents, setIntegrationEvents] = useState<IntegrationEventRow[]>([]);
  const [queueOrderNumber, setQueueOrderNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [orchestrationError, setOrchestrationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrchestration = useCallback(async () => {
    try {
      const [status, jobRows, eventRows] = await Promise.all([
        fetchOrderAutomationStatus(),
        fetchAutomationJobs(20),
        fetchIntegrationEvents(20),
      ]);
      setOrchestration(status);
      setJobs(jobRows);
      setIntegrationEvents(eventRows);
      setOrchestrationError(null);
    } catch (err) {
      setOrchestration(null);
      setJobs([]);
      setIntegrationEvents([]);
      setOrchestrationError(err instanceof Error ? err.message : "orderAutomation.requestFailed");
    }
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    Promise.all([
      fetchAutomationEvents(token, 80).then((data) => {
        setEvents(data.events);
        setStats(data.stats);
      }),
      loadOrchestration(),
    ])
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadOrchestration]);

  async function handleQueueOrder(e: FormEvent) {
    e.preventDefault();
    if (!queueOrderNumber.trim()) return;
    try {
      await queueOrderAutomation(queueOrderNumber.trim());
      setQueueOrderNumber("");
      await loadOrchestration();
    } catch (err) {
      setOrchestrationError(err instanceof Error ? err.message : "orderAutomation.requestFailed");
    }
  }

  async function handleRetryJob(id: number) {
    try {
      await retryAutomationJob(id);
      await loadOrchestration();
    } catch (err) {
      setOrchestrationError(err instanceof Error ? err.message : "orderAutomation.requestFailed");
    }
  }

  if (loading) return <p>Automation wird geladen…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  return (
    <div className="admin-automation">
      <header className="admin-page-header">
        <h1>Automation & KI</h1>
        <p>Benachrichtigungen, Order-Orchestrierung (v0.6), KI-Chat und Empfehlungen</p>
      </header>

      <section className="admin-panel">
        <h2>Order Automation Center (v0.6)</h2>
        <p className="admin-note">
          Payment-&gt;Fulfillment-Flow, Job-Queue, Integration-Events und Webhook-Idempotenz. Erfordert SQLite (
          BUZZARD_DB_ENABLED=1).
        </p>
        {orchestrationError && <p className="shop-modal-error">{orchestrationError}</p>}
        {orchestration ? (
          <>
            <div className="admin-stat-grid">
              <article className="admin-stat">
                <strong>{orchestration.providers.payment}</strong>
                <span>Payment-Provider</span>
              </article>
              <article className="admin-stat">
                <strong>{orchestration.providers.carrier}</strong>
                <span>Carrier</span>
              </article>
              <article className="admin-stat">
                <strong>{orchestration.totals.jobs}</strong>
                <span>Jobs</span>
              </article>
              <article className="admin-stat">
                <strong>{orchestration.totals.events}</strong>
                <span>Integration-Events</span>
              </article>
            </div>

            <form className="automation-queue-form" onSubmit={handleQueueOrder}>
              <input
                value={queueOrderNumber}
                onChange={(e) => setQueueOrderNumber(e.target.value)}
                placeholder="Bestellnummer z. B. BZ-2026-ABCD"
              />
              <button type="submit" className="shop-btn-primary">
                Order queueing
              </button>
            </form>

            <div className="admin-table-wrap">
              <h3>Letzte Jobs</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Bestellung</th>
                    <th>Status</th>
                    <th>Versuche</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.type}</td>
                      <td>{job.order_number}</td>
                      <td>{job.status}</td>
                      <td>{job.attempts}</td>
                      <td>
                        <button type="button" className="shop-btn-secondary" onClick={() => handleRetryJob(job.id)}>
                          Retry
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-table-wrap">
              <h3>Integration-Events</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Zeit</th>
                    <th>Typ</th>
                    <th>Bestellung</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {integrationEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.created_at).toLocaleString("de-DE")}</td>
                      <td>{event.type}</td>
                      <td>{event.order_number}</td>
                      <td>{event.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="admin-note">Order Automation API nicht verfügbar oder deaktiviert.</p>
        )}
      </section>

      {stats ? (
        <section className="admin-stat-grid">
          <article className="admin-stat">
            <strong>{stats.total}</strong>
            <span>Notification-Events</span>
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
        <h2>Notification-Events</h2>
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
