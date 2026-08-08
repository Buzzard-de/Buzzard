"use client";

import { useEffect, useState } from "react";

const TOKEN_KEY = "buzzard_admin_token";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

export default function AdminSeoPanel() {
  const [redirects, setRedirects] = useState<Array<{ from: string; to: string; permanent?: boolean }>>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [productId, setProductId] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [message, setMessage] = useState("");

  async function loadRedirects() {
    const base = apiBase();
    if (!base) return;
    const res = await fetch(`${base}/api/admin/seo/redirects`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    setRedirects(data.redirects || []);
  }

  useEffect(() => {
    loadRedirects().catch(() => {});
  }, []);

  async function saveRedirect() {
    const base = apiBase();
    if (!base || !from || !to) return;
    await fetch(`${base}/api/admin/seo/redirects`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ from, to, permanent: true }),
    });
    setFrom("");
    setTo("");
    setMessage("Redirect gespeichert.");
    loadRedirects();
  }

  async function saveProductSeo() {
    const base = apiBase();
    if (!base || !productId) return;
    await fetch(`${base}/api/admin/seo/overrides/products/${encodeURIComponent(productId)}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ title: seoTitle, description: seoDescription }),
    });
    setMessage("Produkt-SEO gespeichert.");
  }

  return (
    <div className="admin-page">
      <h1>SEO & Marketing</h1>
      {message && <p className="admin-message">{message}</p>}

      <section className="admin-panel">
        <h2>Produkt-SEO Override</h2>
        <div className="admin-form-grid">
          <label>
            Produkt-ID
            <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="prod-000001" />
          </label>
          <label>
            SEO Title
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </label>
          <label>
            Meta Description
            <input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
          </label>
        </div>
        <button type="button" className="shop-btn-primary" onClick={saveProductSeo}>
          Speichern
        </button>
      </section>

      <section className="admin-panel">
        <h2>Redirect Manager</h2>
        <div className="admin-form-grid">
          <label>
            Von
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/alt-url/" />
          </label>
          <label>
            Nach
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="/neue-url/" />
          </label>
        </div>
        <button type="button" className="shop-btn-primary" onClick={saveRedirect}>
          Redirect anlegen
        </button>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Von</th><th>Nach</th><th>Permanent</th></tr>
            </thead>
            <tbody>
              {redirects.map((row) => (
                <tr key={`${row.from}-${row.to}`}>
                  <td>{row.from}</td>
                  <td>{row.to}</td>
                  <td>{row.permanent === false ? "nein" : "ja"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Marketplace Feeds</h2>
        <ul className="admin-list">
          <li><code>/api/feeds/google-merchant.tsv</code></li>
          <li><code>/api/feeds/ebay.tsv</code></li>
          <li><code>/api/feeds/amazon.tsv</code></li>
        </ul>
        <p className="admin-meta">Marketing-IDs nur über Umgebungsvariablen konfigurieren (GA4, GTM, Pixel).</p>
      </section>
    </div>
  );
}
