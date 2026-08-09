"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchWmsInventory,
  fetchWmsInventoryStatus,
  fetchWmsJobs,
  fetchWmsLowStock,
  fetchWmsMovements,
  fetchWmsWarehouses,
} from "@/lib/wmsInventory/client";
import type {
  WmsInventoryRow,
  WmsInventoryStatus,
  WmsStockMovement,
  WmsWarehouse,
  WmsWarehouseJob,
} from "@/lib/wmsInventory/types";

export default function AdminWmsInventoryPanel() {
  const [status, setStatus] = useState<WmsInventoryStatus | null>(null);
  const [warehouses, setWarehouses] = useState<WmsWarehouse[]>([]);
  const [inventory, setInventory] = useState<WmsInventoryRow[]>([]);
  const [lowStock, setLowStock] = useState<WmsInventoryRow[]>([]);
  const [movements, setMovements] = useState<WmsStockMovement[]>([]);
  const [jobs, setJobs] = useState<WmsWarehouseJob[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, warehouseRows, inventoryRows, lowRows, movementRows, jobRows] =
      await Promise.all([
        fetchWmsInventoryStatus(),
        fetchWmsWarehouses(),
        fetchWmsInventory(),
        fetchWmsLowStock(),
        fetchWmsMovements(),
        fetchWmsJobs(),
      ]);
    setStatus(statusRow);
    setWarehouses(warehouseRows);
    setInventory(inventoryRows);
    setLowStock(lowRows);
    setMovements(movementRows);
    setJobs(jobRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "wmsInventory.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade WMS & Inventory…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>WMS & Inventory v1.8</h1>
        <p>Multi-Warehouse, Lagerplätze, Bestände, Reservierungen und Bewegungen (SQLite)</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {status && (
        <section className="admin-kpi-grid">
          {[
            ["Warehouses", String(status.totals.warehouses)],
            ["Locations", String(status.totals.locations)],
            ["SKUs", String(status.totals.inventoryRows)],
            ["Low stock", String(status.totals.lowStock)],
            ["Jobs queued", String(status.totals.warehouseJobs)],
            ["Movements", String(status.totals.movements)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card-grid">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="admin-card">
            <small>{warehouse.code}</small>
            <h2>{warehouse.name}</h2>
            <p>
              {warehouse.country_code} · {warehouse.locations} locations · {warehouse.skus} SKUs
            </p>
            <strong className={warehouse.lowStock > 0 ? "admin-warn" : ""}>
              {warehouse.lowStock} low-stock items
            </strong>
          </div>
        ))}
      </section>

      <section className="admin-card">
        <h2>Inventory</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Warehouse</th>
                <th>Location</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row) => (
                <tr key={row.id} className={row.low_stock ? "admin-row-warn" : ""}>
                  <td>{row.product_sku}</td>
                  <td>{row.warehouse}</td>
                  <td>{row.location || "—"}</td>
                  <td>{row.on_hand}</td>
                  <td>{row.reserved}</td>
                  <td>{row.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Low Stock</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Warehouse</th>
                <th>Available</th>
                <th>Reorder at</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((row) => (
                <tr key={`low-${row.id}`}>
                  <td>{row.product_sku}</td>
                  <td>{row.warehouse}</td>
                  <td>{row.on_hand - row.reserved}</td>
                  <td>{row.reorder_point}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Recent Movements</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Reference</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 20).map((row) => (
                <tr key={row.id}>
                  <td>{row.product_sku}</td>
                  <td>{row.movement_type}</td>
                  <td>{row.quantity}</td>
                  <td>{row.reference || "—"}</td>
                  <td>{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Warehouse Jobs</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Order</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 20).map((job) => (
                <tr key={job.id}>
                  <td>{job.warehouse}</td>
                  <td>{job.order_number || "—"}</td>
                  <td>{job.job_type}</td>
                  <td>{job.status}</td>
                  <td>{job.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
