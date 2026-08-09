"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  createLogisticsShipment,
  fetchFulfillmentJobs,
  fetchLogisticsCarriers,
  fetchLogisticsFulfillmentStatus,
  fetchLogisticsReturns,
  fetchLogisticsShipments,
  fetchShippingOptions,
  updateLogisticsReturn,
} from "@/lib/logisticsFulfillment/client";
import type {
  FulfillmentJob,
  LogisticsCarrier,
  LogisticsFulfillmentStatus,
  LogisticsReturn,
  LogisticsShipment,
  ShippingOption,
} from "@/lib/logisticsFulfillment/types";
import { formatPrice } from "@/lib/products";

const COUNTRIES = ["DE", "AT", "BE", "NL", "FR", "PL", "IT", "ES"];

export default function AdminLogisticsFulfillmentPanel() {
  const [status, setStatus] = useState<LogisticsFulfillmentStatus | null>(null);
  const [carriers, setCarriers] = useState<LogisticsCarrier[]>([]);
  const [shipments, setShipments] = useState<LogisticsShipment[]>([]);
  const [returns, setReturns] = useState<LogisticsReturn[]>([]);
  const [jobs, setJobs] = useState<FulfillmentJob[]>([]);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [country, setCountry] = useState("DE");
  const [orderNumber, setOrderNumber] = useState("BZ-1001");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, carrierRows, shipmentRows, returnRows, jobRows] = await Promise.all([
      fetchLogisticsFulfillmentStatus(),
      fetchLogisticsCarriers(),
      fetchLogisticsShipments(),
      fetchLogisticsReturns(),
      fetchFulfillmentJobs(),
    ]);
    setStatus(statusRow);
    setCarriers(carrierRows);
    setShipments(shipmentRows);
    setReturns(returnRows);
    setJobs(jobRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "logisticsFulfillment.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleFindShipping() {
    setMessage("");
    setError("");
    try {
      const rows = await fetchShippingOptions(country);
      setOptions(rows);
      setMessage(rows.length ? `${rows.length} Versandoptionen für ${country}` : "Keine Optionen gefunden");
    } catch (err) {
      setError(err instanceof Error ? err.message : "logisticsFulfillment.requestFailed");
    }
  }

  async function handleCreateShipment() {
    if (!options[0]) {
      setError("Bitte zuerst Versandoptionen laden");
      return;
    }
    setMessage("");
    setError("");
    try {
      await createLogisticsShipment({
        orderNumber,
        country,
        serviceId: options[0].id,
      });
      setMessage(`Sendung für ${orderNumber} angelegt (Fulfillment-Job queued)`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "logisticsFulfillment.requestFailed");
    }
  }

  async function handleReturnUpdate(row: LogisticsReturn, patch: Partial<LogisticsReturn>) {
    setError("");
    try {
      await updateLogisticsReturn(row.id, {
        status: patch.status,
        returnTracking: patch.return_tracking || undefined,
        refundStatus: patch.refund_status,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "logisticsFulfillment.requestFailed");
    }
  }

  if (loading) return <p>Lade Logistics Fulfillment…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Logistics & Fulfillment v1.7</h1>
        <p>Carrier-Auswahl, Label-Jobs, Sendungsverfolgung und RMA-Returns (SQLite)</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-message">{message}</p>}

      {status && (
        <section className="admin-kpi-grid">
          {[
            ["Carrier", String(status.totals.carriers)],
            ["Services", String(status.totals.shippingServices)],
            ["Shipments", String(status.totals.shipments)],
            ["Jobs queued", String(status.totals.queuedJobs)],
            ["Returns", String(status.totals.returns)],
            ["Tracking events", String(status.totals.trackingEvents)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card-grid">
        <div className="admin-card">
          <h2>Automatische Carrier-Auswahl</h2>
          <div className="admin-inline-form">
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <button type="button" className="shop-btn" onClick={handleFindShipping}>
              Versand finden
            </button>
          </div>
          {options.map((option) => (
            <div key={option.id} className="admin-list-row">
              <span>
                <strong>
                  {option.carrier} · {option.name}
                </strong>
                <small>
                  {formatPrice(option.base_price)} · {option.delivery_days_min}–{option.delivery_days_max} Tage
                </small>
              </span>
            </div>
          ))}
        </div>

        <div className="admin-card">
          <h2>Sendung anlegen</h2>
          <div className="admin-inline-form">
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Bestellnummer"
            />
            <button type="button" className="shop-btn" onClick={handleCreateShipment}>
              Fulfillment-Job starten
            </button>
          </div>
          <p className="admin-hint">
            Label und Tracking werden in Produktion über die Carrier-API erzeugt.
          </p>
        </div>
      </section>

      <section className="admin-card">
        <h2>Carrier</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Scope</th>
                <th>Services</th>
                <th>API</th>
              </tr>
            </thead>
            <tbody>
              {carriers.map((carrier) => (
                <tr key={carrier.id}>
                  <td>{carrier.code}</td>
                  <td>{carrier.name}</td>
                  <td>{carrier.country_scope}</td>
                  <td>{carrier.service_count}</td>
                  <td>{carrier.api_connected ? "connected" : "demo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Shipments</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Carrier</th>
                <th>Service</th>
                <th>Status</th>
                <th>Tracking</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.order_number}</td>
                  <td>{shipment.carrier || "—"}</td>
                  <td>{shipment.service_name || "—"}</td>
                  <td>{shipment.status}</td>
                  <td>{shipment.tracking_number || "Pending"}</td>
                  <td>{formatPrice(shipment.shipping_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Fulfillment Jobs</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Type</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.order_number}</td>
                  <td>{job.job_type}</td>
                  <td>{job.status}</td>
                  <td>{job.attempts}</td>
                  <td>{job.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Returns / RMA</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>RMA</th>
                <th>Order</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Refund</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((row) => (
                <tr key={row.id}>
                  <td>{row.rma_number}</td>
                  <td>{row.order_number}</td>
                  <td>{row.reason}</td>
                  <td>{row.status}</td>
                  <td>{row.refund_status}</td>
                  <td>
                    {row.status === "requested" && (
                      <button
                        type="button"
                        className="shop-btn-secondary"
                        onClick={() => handleReturnUpdate(row, { status: "approved" })}
                      >
                        Approve
                      </button>
                    )}
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
