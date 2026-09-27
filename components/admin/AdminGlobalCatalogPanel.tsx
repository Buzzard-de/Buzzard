"use client";

import { useEffect, useState } from "react";
import { fetchCountryMatrix, fetchGlobalCatalogHealth, type GlobalCatalogHealth } from "@/lib/admin/globalCatalog";

export default function AdminGlobalCatalogPanel() {
  const [health, setHealth] = useState<GlobalCatalogHealth | null>(null);
  const [matrix, setMatrix] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchGlobalCatalogHealth(), fetchCountryMatrix()])
      .then(([healthData, matrixData]) => {
        setHealth(healthData);
        setMatrix(matrixData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load global catalog health"));
  }, []);

  if (error) return <p className="admin-error">{error}</p>;
  if (!health) return <p>Loading global catalog health…</p>;

  return (
    <div className="admin-global-catalog">
      <header>
        <h1>Global Catalog — 35 Countries</h1>
        <p>
          Status: <strong>{health.status}</strong> — BLOCKED is the intended safe state until human-controlled activation.
        </p>
      </header>

      <section className="admin-metrics">
        <div>Countries: {health.countries.configured}/{health.countries.expected}</div>
        <div>Languages: {health.languages.configured} configured ({health.languages.uiReady.join(", ")} UI-ready)</div>
        <div>Currencies: {health.currencies.configured}</div>
        <div>Products: {health.products.total || 0}</div>
        <div>Review required: {health.products.reviewRequired || 0}</div>
        <div>Published: {health.products.published || 0}</div>
      </section>

      <section>
        <h2>Country Matrix</h2>
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>Language</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Products</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={String(row.country)}>
                <td>{String(row.country)} — {String(row.countryName || "")}</td>
                <td>{String(row.language)}</td>
                <td>{String(row.currency)}</td>
                <td>{String(row.catalogStatus)}</td>
                <td>{String(row.productCount)}</td>
                <td>{String(row.reviewCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Safety Contract</h2>
        <pre>{JSON.stringify(health.safety, null, 2)}</pre>
      </section>
    </div>
  );
}
