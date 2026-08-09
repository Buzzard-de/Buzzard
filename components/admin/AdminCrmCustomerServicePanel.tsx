"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchCrmCustomerServiceStatus,
  fetchCrmCustomers,
  fetchCrmOverview,
  fetchCrmTickets,
} from "@/lib/crmCustomerService/client";
import type {
  CrmCustomerRow,
  CrmCustomerServiceStatus,
  CrmOverview,
  CrmTicketRow,
} from "@/lib/crmCustomerService/types";

const MODULES = [
  "Customer profiles",
  "Timeline",
  "Segments",
  "Tags",
  "Tickets",
  "Agent assignment",
  "SLA",
  "Internal notes",
  "Multilingual support ready",
  "AI support ready",
];

export default function AdminCrmCustomerServicePanel() {
  const [status, setStatus] = useState<CrmCustomerServiceStatus | null>(null);
  const [overview, setOverview] = useState<CrmOverview | null>(null);
  const [customers, setCustomers] = useState<CrmCustomerRow[]>([]);
  const [tickets, setTickets] = useState<CrmTicketRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, customerRows, ticketRows] = await Promise.all([
      fetchCrmCustomerServiceStatus(),
      fetchCrmOverview(),
      fetchCrmCustomers(search),
      fetchCrmTickets(search),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setCustomers(customerRows);
    setTickets(ticketRows);
  }, [search]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "crmCustomerService.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade CRM & Customer Service…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>CRM & Customer Service v2.4</h1>
        <p>Customer profiles, timeline, segments, support tickets and SLA tracking</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Customers", overview.customers],
            ["Active", overview.activeCustomers],
            ["VIP", overview.vip],
            ["Open tickets", overview.openTickets],
            ["Urgent", overview.urgentTickets],
            ["SLA risk", overview.slaRisk],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ticket number, subject or customer"
            aria-label="Search CRM"
          />
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Search
          </button>
        </div>

        <h2>Support tickets</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <strong>{ticket.ticket_number}</strong>
                    <br />
                    <small>{ticket.subject}</small>
                  </td>
                  <td>{ticket.customer_email || "guest"}</td>
                  <td>{ticket.category}</td>
                  <td>{ticket.priority}</td>
                  <td>{ticket.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Customers</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Segment</th>
                <th>Country</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 20).map((customer) => (
                <tr key={customer.id}>
                  <td>
                    {customer.first_name} {customer.last_name}
                  </td>
                  <td>{customer.email}</td>
                  <td>{customer.segment}</td>
                  <td>{customer.country_code}</td>
                  <td>{customer.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>CRM modules</h2>
        <div className="admin-flow">
          {MODULES.map((module, index) => (
            <span key={module}>
              {index > 0 && <span aria-hidden="true"> · </span>}
              <strong>{module}</strong>
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · {status.totals.events} timeline events · {status.totals.messages}{" "}
            ticket messages
          </p>
        </section>
      )}
    </div>
  );
}
