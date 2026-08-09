"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchProductCatalogPimOverview,
  fetchProductCatalogPimProducts,
  fetchProductCatalogPimStatus,
} from "@/lib/productCatalogPim/client";
import type {
  ProductCatalogPimOverview,
  ProductCatalogPimProductRow,
  ProductCatalogPimStatus,
} from "@/lib/productCatalogPim/types";
import { formatPrice } from "@/lib/products";

const FEATURES = [
  "Products",
  "Variants",
  "Brands",
  "Categories",
  "Attributes",
  "Media metadata",
  "Multi-language",
  "SEO fields",
  "Supplier refs",
  "Completeness score",
  "TecDoc boundary",
  "Search index ready",
];

export default function AdminProductCatalogPimPanel() {
  const [status, setStatus] = useState<ProductCatalogPimStatus | null>(null);
  const [overview, setOverview] = useState<ProductCatalogPimOverview | null>(null);
  const [products, setProducts] = useState<ProductCatalogPimProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, productRows] = await Promise.all([
      fetchProductCatalogPimStatus(),
      fetchProductCatalogPimOverview(),
      fetchProductCatalogPimProducts(search),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setProducts(productRows);
  }, [search]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "productCatalogPim.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Product Catalog PIM…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Product Catalog & PIM v3.0</h1>
        <p>Master data, variants, translations, attributes, media, SEO and supplier references</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Products", overview.products],
            ["Active", overview.active],
            ["Drafts", overview.drafts],
            ["Incomplete", overview.incomplete],
            ["Variants", overview.variants],
            ["Brands", overview.brands],
            ["Categories", overview.categories],
            ["Translations", overview.translations],
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
            placeholder="SKU, barcode or supplier SKU"
            aria-label="Search products"
          />
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Search
          </button>
        </div>

        <h2>Product catalog</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Brand / Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Completeness</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.sku}</strong>
                    <br />
                    <small>{row.barcode || "—"}</small>
                  </td>
                  <td>
                    {row.brand_name || "—"}
                    <br />
                    <small>{row.category_name || "—"}</small>
                  </td>
                  <td>{formatPrice(row.selling_price)}</td>
                  <td>{row.stock_qty}</td>
                  <td>{row.completeness}%</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>PIM features</h2>
        <div className="admin-flow">
          {FEATURES.map((item) => (
            <span key={item} className="admin-tag">
              {item}
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · handoff to v2.9 search index, supplier feeds and image CDN
          </p>
        </section>
      )}
    </div>
  );
}
