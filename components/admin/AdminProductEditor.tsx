"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdminProduct, updateAdminProduct } from "@/lib/admin/client";
import type { AdminProduct } from "@/lib/admin/types";
import { formatPrice } from "@/lib/products";

export default function AdminProductEditor({ productId }: { productId: string }) {
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAdminProduct(productId).then(setProduct).catch(() => setProduct(null));
  }, [productId]);

  async function save() {
    if (!product) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateAdminProduct(product.id, {
        name: product.name,
        brand: product.brand,
        stock: product.stock,
        price: product.price,
        supplier_price: product.supplier_price,
        category_id: product.category_id,
        status: product.status,
      });
      setProduct(updated);
      setMessage("Gespeichert.");
    } catch {
      setMessage("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  if (!product) return <p>Produkt nicht gefunden.</p>;

  return (
    <div className="admin-page">
      <Link href="/admin/products/" className="checkout-back-link">← Zurück zur Liste</Link>
      <h1>{product.name}</h1>
      <div className="admin-form-grid">
        <label>Name<input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} /></label>
        <label>Marke<input value={product.brand || ""} onChange={(e) => setProduct({ ...product, brand: e.target.value })} /></label>
        <label>Bestand<input type="number" value={product.stock} onChange={(e) => setProduct({ ...product, stock: Number(e.target.value) })} /></label>
        <label>Status
          <select value={product.status} onChange={(e) => setProduct({ ...product, status: e.target.value })}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label>VK-Preis<input type="number" step="0.01" value={product.price?.amount ?? 0} onChange={(e) => setProduct({ ...product, price: { amount: Number(e.target.value), currency: "EUR" } })} /></label>
        <label className="admin-private">EK-Preis (privat)<input type="number" step="0.01" value={product.supplier_price?.amount ?? 0} onChange={(e) => setProduct({ ...product, supplier_price: { amount: Number(e.target.value), currency: "EUR" } })} /></label>
        <label>Kategorie-ID<input value={product.category_id} onChange={(e) => setProduct({ ...product, category_id: e.target.value })} /></label>
      </div>
      <p className="admin-meta">Lieferant: {product.supplier_id} · SKU: {product.supplier_sku} · Aktueller VK: {formatPrice(product.price?.amount ?? 0)}</p>
      <button type="button" className="shop-btn-primary" onClick={save} disabled={saving}>{saving ? "Speichern…" : "Speichern"}</button>
      {message && <p className="admin-message">{message}</p>}
    </div>
  );
}
