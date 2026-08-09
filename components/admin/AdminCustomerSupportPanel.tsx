"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  createAdminTrackingEvent,
  fetchAdminCustomerSupportStatus,
  fetchAdminSupportTemplates,
  fetchAdminSupportTicket,
  fetchAdminSupportTickets,
  replyAdminSupportTicket,
  updateAdminSupportTicket,
} from "@/lib/customerSupport/client";
import type {
  CustomerSupportStatus,
  SupportTemplate,
  SupportTicket,
  TicketMessage,
} from "@/lib/customerSupport/types";

export default function AdminCustomerSupportPanel() {
  const [status, setStatus] = useState<CustomerSupportStatus | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [templates, setTemplates] = useState<SupportTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ ticket: SupportTicket; messages: TicketMessage[] } | null>(
    null
  );
  const [reply, setReply] = useState("");
  const [trackingOrder, setTrackingOrder] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("in_transit");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, ticketRows, templateRows] = await Promise.all([
      fetchAdminCustomerSupportStatus(),
      fetchAdminSupportTickets(),
      fetchAdminSupportTemplates(),
    ]);
    setStatus(statusRow);
    setTickets(ticketRows);
    setTemplates(templateRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "customerSupport.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetchAdminSupportTicket(selectedId)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "customerSupport.requestFailed"));
  }, [selectedId]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await replyAdminSupportTicket(selectedId, reply.trim());
      setReply("");
      setMessage("Antwort gesendet");
      await reload();
      const next = await fetchAdminSupportTicket(selectedId);
      setDetail(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerSupport.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseTicket() {
    if (!selectedId) return;
    setBusy(true);
    try {
      await updateAdminSupportTicket(selectedId, { status: "closed" });
      setMessage("Ticket geschlossen");
      await reload();
      const next = await fetchAdminSupportTicket(selectedId);
      setDetail(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerSupport.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTrackingEvent(e: FormEvent) {
    e.preventDefault();
    if (!trackingOrder.trim()) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await createAdminTrackingEvent({
        orderNumber: trackingOrder.trim(),
        status: trackingStatus,
        carrier: "DHL",
      });
      setMessage(`Tracking-Event für ${trackingOrder.trim()} angelegt`);
      setTrackingOrder("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerSupport.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Lade Customer Support…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Customer Support v1.1</h1>
        <p>Tickets, Tracking-Timeline und Benachrichtigungs-Queue</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      {status && (
        <section className="admin-card">
          <h2>Status</h2>
          <ul className="admin-stats">
            <li>Tickets: {status.totals.tickets}</li>
            <li>Offen: {status.totals.openTickets}</li>
            <li>Nachrichten: {status.totals.ticketMessages}</li>
            <li>Tracking-Events: {status.totals.trackingEvents}</li>
            <li>Templates: {status.totals.supportTemplates}</li>
            <li>Queue: {status.totals.queuedNotifications}</li>
          </ul>
        </section>
      )}

      <div className="admin-grid-two">
        <section className="admin-card">
          <h2>Ticket-Queue</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Betreff</th>
                <th>Status</th>
                <th>Priorität</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={selectedId === ticket.id ? "active" : ""}
                  onClick={() => setSelectedId(ticket.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{ticket.ticket_number}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.status}</td>
                  <td>{ticket.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="admin-card">
          <h2>Ticket-Detail</h2>
          {!detail ? (
            <p>Ticket auswählen</p>
          ) : (
            <>
              <p>
                <strong>{detail.ticket.ticket_number}</strong> · {detail.ticket.subject}
              </p>
              <ul className="admin-message-list">
                {detail.messages.map((msg) => (
                  <li key={msg.id}>
                    <strong>{msg.sender_type}</strong>
                    <p>{msg.message}</p>
                    <small>{msg.created_at}</small>
                  </li>
                ))}
              </ul>
              <form className="admin-form" onSubmit={handleReply}>
                <label>
                  Antwort
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} required />
                </label>
                <button type="submit" className="shop-btn-primary" disabled={busy}>
                  Antworten
                </button>
                <button type="button" className="shop-btn-secondary" disabled={busy} onClick={handleCloseTicket}>
                  Schließen
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      <section className="admin-card">
        <h2>Tracking-Event anlegen</h2>
        <form className="admin-form" onSubmit={handleTrackingEvent}>
          <label>
            Bestellnummer
            <input value={trackingOrder} onChange={(e) => setTrackingOrder(e.target.value)} required />
          </label>
          <label>
            Status
            <select value={trackingStatus} onChange={(e) => setTrackingStatus(e.target.value)}>
              <option value="label_created">Label erstellt</option>
              <option value="picked_up">Abgeholt</option>
              <option value="in_transit">Unterwegs</option>
              <option value="delivered">Zugestellt</option>
            </select>
          </label>
          <button type="submit" className="shop-btn-primary" disabled={busy}>
            Event speichern
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Canned Templates</h2>
        <ul>
          {templates.map((template) => (
            <li key={template.id}>
              <strong>{template.title}</strong>
              <p>{template.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
