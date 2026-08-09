"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createSupportTicket,
  fetchOrderTracking,
  fetchSupportTicket,
  fetchSupportTickets,
  replyToSupportTicket,
} from "@/lib/customerSupport/client";
import { shouldUseCustomerSupportApi } from "@/lib/customerSupport/runtime";
import type { OrderTrackingTimeline, SupportTicket, TicketMessage } from "@/lib/customerSupport/types";
import { useLocale } from "@/lib/i18n/context";

export default function AccountSupportPanel() {
  const { t } = useLocale();
  const enabled = shouldUseCustomerSupportApi();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ ticket: SupportTicket; messages: TicketMessage[] } | null>(
    null
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [reply, setReply] = useState("");
  const [trackingOrder, setTrackingOrder] = useState("");
  const [tracking, setTracking] = useState<OrderTrackingTimeline | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reloadTickets = useCallback(async () => {
    const rows = await fetchSupportTickets();
    setTickets(rows);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    reloadTickets()
      .catch((err) => setError(err instanceof Error ? err.message : "customerSupport.requestFailed"))
      .finally(() => setLoading(false));
  }, [enabled, reloadTickets]);

  useEffect(() => {
    if (!selectedId || !enabled) {
      setDetail(null);
      return;
    }
    fetchSupportTicket(selectedId)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "customerSupport.requestFailed"));
  }, [selectedId, enabled]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        orderNumber: orderNumber.trim() || undefined,
      });
      setNotice(t("account.supportCreated").replace("{ticket}", created.ticketNumber));
      setSubject("");
      setMessage("");
      setOrderNumber("");
      await reloadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerSupport.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await replyToSupportTicket(selectedId, reply.trim());
      setReply("");
      const next = await fetchSupportTicket(selectedId);
      setDetail(next);
      await reloadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerSupport.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTrack(e: FormEvent) {
    e.preventDefault();
    if (!trackingOrder.trim()) return;
    setBusy(true);
    setError("");
    try {
      const timeline = await fetchOrderTracking(trackingOrder.trim());
      setTracking(timeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerSupport.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <div className="account-page">
        <h1>{t("account.supportTitle")}</h1>
        <p>{t("account.supportUnavailable")}</p>
        <Link href="/impressum/" className="shop-btn-secondary">
          {t("account.support")}
        </Link>
      </div>
    );
  }

  if (loading) return <p>{t("account.supportLoading")}</p>;

  return (
    <div className="account-page">
      <h1>{t("account.supportTitle")}</h1>
      <p className="account-lead">{t("account.supportLead")}</p>

      {error && <p className="shop-modal-error">{error}</p>}
      {notice && <p className="admin-success">{notice}</p>}

      <section className="account-panel">
        <h2>{t("account.supportNew")}</h2>
        <form className="account-form" onSubmit={handleCreate}>
          <label>
            {t("account.supportSubject")}
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <label>
            {t("account.orderNumber")} ({t("account.optional")})
            <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
          </label>
          <label>
            {t("account.supportMessage")}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          <button type="submit" className="shop-btn-primary" disabled={busy}>
            {t("account.supportSubmit")}
          </button>
        </form>
      </section>

      <section className="account-panel">
        <h2>{t("account.supportTickets")}</h2>
        {tickets.length === 0 ? (
          <p>{t("account.supportNoTickets")}</p>
        ) : (
          <ul className="account-order-list">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  className="account-link-btn"
                  onClick={() => setSelectedId(ticket.id)}
                >
                  <strong>{ticket.ticket_number}</strong> · {ticket.subject}
                </button>
                <span>{ticket.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail && (
        <section className="account-panel">
          <h2>{detail.ticket.ticket_number}</h2>
          <ul className="account-message-list">
            {detail.messages.map((msg) => (
              <li key={msg.id}>
                <strong>{msg.sender_type}</strong>
                <p>{msg.message}</p>
                <small>{msg.created_at}</small>
              </li>
            ))}
          </ul>
          <form className="account-form" onSubmit={handleReply}>
            <label>
              {t("account.supportReply")}
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} required />
            </label>
            <button type="submit" className="shop-btn-secondary" disabled={busy}>
              {t("account.supportSendReply")}
            </button>
          </form>
        </section>
      )}

      <section className="account-panel">
        <h2>{t("account.supportTracking")}</h2>
        <form className="account-form account-form-inline" onSubmit={handleTrack}>
          <label>
            {t("account.orderNumber")}
            <input value={trackingOrder} onChange={(e) => setTrackingOrder(e.target.value)} required />
          </label>
          <button type="submit" className="shop-btn-secondary" disabled={busy}>
            {t("account.supportTrack")}
          </button>
        </form>
        {tracking && (
          <ul className="account-message-list">
            {tracking.events.length === 0 ? (
              <li>{t("account.supportNoTracking")}</li>
            ) : (
              tracking.events.map((event) => (
                <li key={event.id}>
                  <strong>{event.status}</strong>
                  <span>
                    {event.location ? `${event.location} · ` : ""}
                    {event.event_time || event.created_at}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
