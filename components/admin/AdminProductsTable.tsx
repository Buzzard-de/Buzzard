"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdminProducts, setProductStatus } from "@/lib/admin/client";
import type { AdminProduct } from "@/lib/admin/types";
import { formatPrice } from "@/lib/products";

export default function AdminProductsTable() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(search = q) {
    setLoading(true);
    try {
      setProducts(await fetchAdminProducts(search));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(product: AdminProduct) {
    const next = product.status === "active" ? "paused" : "active";
    await setProductStatus(product.id, next);
    load();
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Produkte</h1>
        <form
          className="admin-search"
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche SKU, Name, EAN…" />
          <button type="submit" className="shop-btn-secondary">Suchen</button>
        </form>
      </div>
      {loading ? (
        <p>Lade…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Status</th>
                <th>Bestand</th>
                <th>VK</th>
                <th>EK (privat)</th>
                <th>Lieferant</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>
                    <Link href={`/admin/products/${p.id}/`}>{p.name}</Link>
                  </td>
                  <td><span className={`admin-badge status-${p.status}`}>{p.status}</span></td>
                  <td>{p.stock}</td>
                  <td>{formatPrice(p.price?.amount ?? 0)}</td>
                  <td className="admin-private">{formatPrice(p.supplier_price?.amount ?? 0)}</td>
                  <td>{p.supplier_id}</td>
                  <td>
                    <button type="button" className="shop-btn-secondary" onClick={() => toggleStatus(p)}>
                      {p.status === "active" ? "Pausieren" : "Aktivieren"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
