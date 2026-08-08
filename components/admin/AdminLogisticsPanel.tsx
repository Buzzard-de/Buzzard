"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  fetchAdminFulfillments,
  fetchAdminReturns,
  fetchAdminShipments,
  fetchAdminSupplierOrders,
  retryAdminFulfillment,
  updateAdminReturnStatus,
  updateAdminShipment,
} from "@/lib/logistics/client";
import type { Fulfillment, ReturnRequest, Shipment } from "@/lib/logistics/types";

const SHIPMENT_STATUSES = [
  "pending",
  "preparing",
  "handed_to_carrier",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
  "returned",
];

const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "refunded", "closed"];

export default function AdminLogisticsPanel() {
  return (
    <Suspense fallback={<div className="admin-loading">…</div>}>
      <AdminLogisticsPanelInner />
    </Suspense>
  );
}

function AdminLogisticsPanelInner() {
  const searchParams = useSearchParams();
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<
    Array<{ id: string; buzzardOrderNumber: string; supplierId: string; status: string; error: string | null }>
  >([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [filter, setFilter] = useState(searchParams.get("order") || "");
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const orderNumber = filter.trim() || undefined;
    const [f, s, so, r] = await Promise.all([
      fetchAdminFulfillments(orderNumber),
      fetchAdminShipments(orderNumber),
      fetchAdminSupplierOrders(orderNumber),
      fetchAdminReturns(),
    ]);
    setFulfillments(f);
    setShipments(s);
    setSupplierOrders(so);
    setReturns(orderNumber ? r.filter((item) => item.orderNumber === orderNumber) : r);
  }, [filter]);

  const refresh = useCallback(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRetry(id: string) {
    await retryAdminFulfillment(id);
    await load();
  }

  async function handleShipmentUpdate(shipment: Shipment, status?: string) {
    await updateAdminShipment(shipment.id, {
      trackingNumber: trackingDraft[shipment.id] || shipment.trackingNumber || undefined,
      carrier: shipment.carrier,
      status,
    });
    load();
  }

  async function handleReturnStatus(id: string, status: string) {
    await updateAdminReturnStatus(id, status);
    load();
  }

  return (
    <div className="admin-page">
      <h1>Logistik & Versand</h1>
      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="Bestellnummer filtern…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="shop-btn-secondary" onClick={refresh}>
          Aktualisieren
        </button>
      </div>

      <section className="admin-section">
        <h2>Fulfillments</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bestellung</th>
                <th>Modell</th>
                <th>Status</th>
                <th>Fehler</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {fulfillments.map((f) => (
                <tr key={f.id}>
                  <td>{f.orderNumber}</td>
                  <td>{f.model}</td>
                  <td>{f.status}</td>
                  <td>{f.error || "—"}</td>
                  <td>
                    {f.status === "failed" && (
                      <button type="button" className="shop-btn-secondary" onClick={() => handleRetry(f.id)}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Sendungen</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bestellung</th>
                <th>Carrier</th>
                <th>Tracking</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td>{s.orderNumber}</td>
                  <td>{s.carrier}</td>
                  <td>
                    <input
                      type="text"
                      className="admin-inline-input"
                      placeholder="Tracking-Nr."
                      defaultValue={s.trackingNumber || ""}
                      onChange={(e) =>
                        setTrackingDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <select
                      defaultValue={s.status}
                      onChange={(e) => handleShipmentUpdate(s, e.target.value)}
                    >
                      {SHIPMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {s.trackingUrl && (
                      <a href={s.trackingUrl} target="_blank" rel="noreferrer">
                        Link
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Lieferanten-Bestellungen</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bestellung</th>
                <th>Lieferant</th>
                <th>Status</th>
                <th>Fehler</th>
              </tr>
            </thead>
            <tbody>
              {supplierOrders.map((so) => (
                <tr key={so.id}>
                  <td>{so.buzzardOrderNumber}</td>
                  <td>{so.supplierId}</td>
                  <td>{so.status}</td>
                  <td>{so.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Rücksendungen</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bestellung</th>
                <th>Grund</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.orderNumber}</td>
                  <td>{r.reason}</td>
                  <td>{r.status}</td>
                  <td>
                    <select
                      defaultValue={r.status}
                      onChange={(e) => handleReturnStatus(r.id, e.target.value)}
                    >
                      {RETURN_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
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
