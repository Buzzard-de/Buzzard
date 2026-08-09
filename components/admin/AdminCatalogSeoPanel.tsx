"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  bulkUpdateCatalogPrices,
  createCatalogProduct,
  fetchAdminCatalogProducts,
  fetchCatalogCategories,
  fetchCatalogSeoStatus,
  updateCatalogProduct,
} from "@/lib/catalogSeo/client";
import type { CatalogCategory, CatalogProduct, CatalogProductInput, CatalogSeoStatus } from "@/lib/catalogSeo/types";

function money(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value || 0);
}

function toEditor(product: CatalogProduct): CatalogProductInput {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.category_id,
    supplierCostEur: product.supplier_cost_eur,
    priceEur: product.price_eur,
    marginFloor: product.margin_floor,
    stock: product.stock,
    imageUrl: product.image_url,
    seoTitle: product.seo_title,
    seoDescription: product.seo_description,
    slug: product.slug,
    active: product.active,
  };
}

export default function AdminCatalogSeoPanel() {
  const [status, setStatus] = useState<CatalogSeoStatus | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<CatalogProductInput | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setError("");
    const [productRows, categoryRows, hubStatus] = await Promise.all([
      fetchAdminCatalogProducts(),
      fetchCatalogCategories(),
      fetchCatalogSeoStatus().catch(() => null),
    ]);
    setProducts(productRows);
    setCategories(categoryRows);
    setStatus(hubStatus);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "catalogSeo.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  const visible = products.filter((product) => {
    const query = q.trim().toLowerCase();
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query);
    const matchesCategory = !cat || product.category === cat;
    return matchesQuery && matchesCategory;
  });

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editing?.sku || !editing.name) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (editing.id) {
        await updateCatalogProduct(editing.id, editing);
      } else {
        await createCatalogProduct(editing);
      }
      setMessage("Gespeichert");
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "catalogSeo.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkPrice() {
    setBusy(true);
    setError("");
    try {
      const result = await bulkUpdateCatalogPrices(status?.pricing.defaultMargin ?? 0.3);
      setMessage(`${result.updated} Preise aktualisiert (Marge ${Math.round(result.margin * 100)} %)`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "catalogSeo.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Katalog wird geladen…</p>;

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Katalog & SEO</h1>
        {status?.version && <span className="admin-note">API v{status.version}</span>}
      </div>

      <p className="admin-note">
        SQLite-Produktkatalog mit automatischer Preislogik, SEO-Feldern, Bild-URLs und JSON-LD/Sitemap-Endpunkten.
        Produktbilder in Produktion über CDN/Object Storage bereitstellen.
      </p>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-message">{message}</p>}

      {status && (
        <div className="admin-stat-grid">
          <article className="admin-stat">
            <strong>{status.totals.products}</strong>
            <span>Aktive Produkte</span>
          </article>
          <article className="admin-stat">
            <strong>{status.totals.categories}</strong>
            <span>Kategorien</span>
          </article>
          <article className="admin-stat">
            <strong>{Math.round(status.pricing.defaultMargin * 100)}%</strong>
            <span>Standard-Marge</span>
          </article>
          <article className="admin-stat">
            <strong>{status.publicBaseUrl.replace(/^https?:\/\//, "")}</strong>
            <span>Public Base URL</span>
          </article>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-page-head">
          <h2>Produktkatalog</h2>
          <button type="button" className="shop-btn-secondary" disabled={busy} onClick={handleBulkPrice}>
            Bulk-Preise (Marge)
          </button>
        </div>
        <div className="automation-queue-form">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Produkt oder SKU suchen…" />
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Alle Kategorien</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="button" className="shop-btn-primary" onClick={() => setEditing({ stock: 0, marginFloor: 0.12 })}>
            + Produkt
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Kategorie</th>
                <th>EK</th>
                <th>VK</th>
                <th>Bestand</th>
                <th>SEO</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.category || "—"}</td>
                  <td>{money(product.supplier_cost_eur)}</td>
                  <td>{money(product.price_eur)}</td>
                  <td>{product.stock}</td>
                  <td>{product.seo_title ? "✓" : "—"}</td>
                  <td>
                    <button type="button" className="shop-btn-secondary" onClick={() => setEditing(toEditor(product))}>
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <section className="admin-panel">
          <h2>{editing.id ? "Produkt bearbeiten" : "Produkt anlegen"}</h2>
          <form className="admin-form-grid" onSubmit={handleSave}>
            <label>
              SKU
              <input
                value={editing.sku || ""}
                onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                required
              />
            </label>
            <label>
              Name
              <input
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
              />
            </label>
            <label>
              Kategorie
              <select
                value={editing.categoryId || ""}
                onChange={(e) =>
                  setEditing({ ...editing, categoryId: Number(e.target.value) || null })
                }
              >
                <option value="">Keine</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Einkaufspreis (EUR)
              <input
                type="number"
                step="0.01"
                value={editing.supplierCostEur ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, supplierCostEur: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Verkaufspreis (leer = auto)
              <input
                type="number"
                step="0.01"
                value={editing.priceEur ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priceEur: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Bestand
              <input
                type="number"
                value={editing.stock ?? 0}
                onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
              />
            </label>
            <label>
              Bild-URL
              <input
                value={editing.imageUrl || ""}
                onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
              />
            </label>
            <label className="admin-form-span">
              Beschreibung
              <textarea
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>
            <label>
              SEO Titel
              <input
                value={editing.seoTitle || ""}
                onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
              />
            </label>
            <label className="admin-form-span">
              SEO Beschreibung
              <textarea
                value={editing.seoDescription || ""}
                onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })}
              />
            </label>
            {editing.id && (
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={editing.active !== false}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Aktiv
              </label>
            )}
            <div className="admin-form-actions">
              <button type="submit" className="shop-btn-primary" disabled={busy}>
                Speichern
              </button>
              <button type="button" className="shop-btn-secondary" onClick={() => setEditing(null)}>
                Abbrechen
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-panel">
        <h2>SEO-Endpunkte (API)</h2>
        <ul className="admin-list">
          <li>
            <code>/api/catalog/sitemap.xml</code> — dynamische Produkt-Sitemap
          </li>
          <li>
            <code>/api/catalog/robots.txt</code> — Robots inkl. Sitemap-Verweis
          </li>
          <li>
            <code>/api/catalog/products/:id/jsonld</code> — Product JSON-LD
          </li>
        </ul>
      </section>
    </div>
  );
}
