"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchPimBrands,
  fetchPimCatalogStatus,
  fetchPimCategories,
  fetchPimCompletenessStats,
  fetchPimImportJobs,
  fetchPimProducts,
} from "@/lib/pimCatalog/client";
import type {
  PimBrand,
  PimCatalogStatus,
  PimCategory,
  PimCompletenessStats,
  PimImportJob,
  PimProduct,
} from "@/lib/pimCatalog/types";
import { formatPrice } from "@/lib/products";

export default function AdminPimCatalogPanel() {
  const [status, setStatus] = useState<PimCatalogStatus | null>(null);
  const [stats, setStats] = useState<PimCompletenessStats | null>(null);
  const [categories, setCategories] = useState<PimCategory[]>([]);
  const [brands, setBrands] = useState<PimBrand[]>([]);
  const [products, setProducts] = useState<PimProduct[]>([]);
  const [jobs, setJobs] = useState<PimImportJob[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, statsRow, categoryRows, brandRows, productRows, jobRows] = await Promise.all([
      fetchPimCatalogStatus(),
      fetchPimCompletenessStats(),
      fetchPimCategories(),
      fetchPimBrands(),
      fetchPimProducts(search.trim() || undefined),
      fetchPimImportJobs(),
    ]);
    setStatus(statusRow);
    setStats(statsRow);
    setCategories(categoryRows);
    setBrands(brandRows);
    setProducts(productRows);
    setJobs(jobRows);
  }, [search]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "pimCatalog.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade PIM Catalog…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>PIM & Product Catalog v1.9</h1>
        <p>Master-Daten, Varianten, Mehrsprachigkeit, Attribute, Media, SEO und Feed-Readiness</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {stats && (
        <section className="admin-kpi-grid">
          {[
            ["Products", String(stats.total)],
            ["Published", String(stats.published)],
            ["Avg completeness", `${stats.averageCompleteness}%`],
            ["Feed ready", String(stats.readyForFeed)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      {status && (
        <section className="admin-kpi-grid">
          {[
            ["Categories", String(status.totals.categories)],
            ["Brands", String(status.totals.brands)],
            ["Variants", String(status.totals.variants)],
            ["Import jobs", String(status.totals.importJobs)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <div className="admin-inline-form">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SKU, EAN, Brand oder Kategorie suchen"
          />
          <button type="button" className="shop-btn" onClick={() => reload().catch(() => {})}>
            Suchen
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h2>Products</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Completeness</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td>{product.brand || "—"}</td>
                  <td>{product.category || "—"}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>{product.status}</td>
                  <td>{product.completeness}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card-grid">
        <div className="admin-card">
          <h2>Categories ({categories.length})</h2>
          <ul className="admin-list">
            {categories.slice(0, 12).map((category) => (
              <li key={category.id}>
                <strong>{category.code}</strong> · {category.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-card">
          <h2>Brands ({brands.length})</h2>
          <ul className="admin-list">
            {brands.map((brand) => (
              <li key={brand.id}>{brand.name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="admin-card">
        <h2>Product architecture</h2>
        <p>
          Master product → variants → multilingual content → technical attributes → media → SEO →
          marketplace feed.
        </p>
      </section>

      <section className="admin-card">
        <h2>Import Jobs</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Name</th>
                <th>Status</th>
                <th>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 10).map((job) => (
                <tr key={job.id}>
                  <td>{job.source_type}</td>
                  <td>{job.source_name}</td>
                  <td>{job.status}</td>
                  <td>
                    {job.items_processed}/{job.items_total}
                  </td>
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
