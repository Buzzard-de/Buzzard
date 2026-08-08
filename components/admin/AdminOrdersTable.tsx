"use client";

import { useEffect, useState } from "react";
import { fetchAdminOrders, updateOrderStatus } from "@/lib/admin/client";
import type { AdminOrder } from "@/lib/admin/types";
import { formatPrice } from "@/lib/products";

const STATUSES = ["pending", "payment_pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  async function load() {
    setOrders(await fetchAdminOrders());
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function changeStatus(orderNumber: string, status: string) {
    await updateOrderStatus(orderNumber, status);
    load();
  }

  return (
    <div className="admin-page">
      <h1>Bestellungen</h1>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Bestellnr.</th>
              <th>Kunde</th>
              <th>Status</th>
              <th>Gesamt</th>
              <th>Datum</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderNumber}>
                <td>{order.orderNumber}</td>
                <td>{order.customer.firstName} {order.customer.lastName}<br /><small>{order.customer.email}</small></td>
                <td>{order.status}</td>
                <td>{formatPrice(order.total)}</td>
                <td>{new Date(order.createdAt).toLocaleString("de-DE")}</td>
                <td>
                  <select
                    defaultValue={order.status}
                    onChange={(e) => changeStatus(order.orderNumber, e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {" "}
                  <a href={`/admin/logistics/?order=${encodeURIComponent(order.orderNumber)}`}>Logistik</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
