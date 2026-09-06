"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchCategoryAttributeSchema,
  fetchPimAiCapabilities,
  fetchPimBrands,
  fetchPimHealth,
  fetchPimProducts,
  fetchPimQuality,
  fetchSupplierMappings,
  runPimImport,
  validatePimProduct,
} from "@/lib/admin/pimCore";
import type {
  PimBrand,
  PimHealthReport,
  PimProduct,
  PimStructuredValidationReport,
  PimSupplierMapping,
  PimValidationResult,
  PimWorkflowStatus,
} from "@/lib/admin/pimCoreTypes";

type Tab = "products" | "brands" | "import" | "validation" | "mapping" | "attributes";

const WORKFLOW_FILTERS: Array<PimWorkflowStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "INVALID",
  "REVIEW_REQUIRED",
  "READY_FOR_REVIEW",
  "APPROVED",
  "PUBLISH_BLOCKED",
];

export default function AdminPimCorePanel() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<PimProduct[]>([]);
  const [brands, setBrands] = useState<PimBrand[]>([]);
  const [mappings, setMappings] = useState<PimSupplierMapping[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validation, setValidation] = useState<PimValidationResult | null>(null);
  const [validationReport, setValidationReport] = useState<PimStructuredValidationReport | null>(null);
  const [health, setHealth] = useState<PimHealthReport | null>(null);
  const [workflowFilter, setWorkflowFilter] = useState<PimWorkflowStatus | "ALL">("ALL");
  const [quality, setQuality] = useState<{ score: number; dimensions: Record<string, number> } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [attributeSchema, setAttributeSchema] = useState<string | null>(null);
  const [aiCaps, setAiCaps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [productRows, brandRows, mappingRows, caps, healthReport] = await Promise.all([
      fetchPimProducts(workflowFilter === "ALL" ? undefined : { workflow: workflowFilter }),
      fetchPimBrands(),
      fetchSupplierMappings(),
      fetchPimAiCapabilities(),
      fetchPimHealth().catch(() => null),
    ]);
    setProducts(productRows);
    setBrands(brandRows);
    setMappings(mappingRows);
    setAiCaps(caps);
    setHealth(healthReport);
    if (productRows[0] && !selectedId) setSelectedId(productRows[0].id);
  }, [selectedId, workflowFilter]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleSelectProduct(id: string) {
    setSelectedId(id);
    setValidation(null);
    setQuality(null);
    try {
      const q = await fetchPimQuality(id);
      setQuality(q);
    } catch {
      setQuality(null);
    }
  }

  async function handleValidate() {
    if (!selectedId) return;
    const result = await validatePimProduct(selectedId);
    setValidation(result.validation);
    setValidationReport(result.report);
    setTab("validation");
  }

  async function handleDryRunImport() {
    const result = await runPimImport(
      {
        sku: "BZ-IMPORT-DRY-001",
        supplierSku: "SUP-DRY-001",
        title: "Dry Run Import Product",
        ean: "4006381333932",
        category: "cat-05",
        price: 19.99,
        stock: 5,
      },
      true
    );
    setImportResult(`Dry run ${result.importJobId}: ${result.validation.overall} (${result.stages.length} stages)`);
    setTab("import");
  }

  async function handleLoadAttributes() {
    const schema = await fetchCategoryAttributeSchema("cat-05");
    setAttributeSchema(schema ? JSON.stringify(schema.attributes || [], null, 2) : "No schema");
    setTab("attributes");
  }

  if (loading) return <p>PIM Core wird geladen…</p>;
  if (error) return <p className="admin-error">{error}</p>;

  const selected = products.find((p) => p.id === selectedId);

  return (
    <div className="admin-pim-core">
      <header className="admin-page-header">
        <h1>Product Core & PIM</h1>
        <p>Category-agnostic PIM foundation. Sales remain disabled — publish is manual only.</p>
        {health && (
          <p className="admin-note">
            PIM health: {health.summary.totalProducts} products · {health.summary.reviewRequired} review ·{" "}
            {health.summary.demoProducts} demo · publish blocked
          </p>
        )}
      </header>

      <nav className="admin-tabs" aria-label="PIM Core sections">
        {(
          [
            ["products", "Products"],
            ["brands", "Brands"],
            ["import", "Import"],
            ["validation", "Validation"],
            ["mapping", "Supplier Mapping"],
            ["attributes", "Attributes"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "admin-tab active" : "admin-tab"}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "products" && (
        <section className="admin-panel">
          <h2>Products</h2>
          <label className="admin-filter">
            Workflow filter{" "}
            <select
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value as PimWorkflowStatus | "ALL")}
            >
              {WORKFLOW_FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Title</th>
                <th>Status</th>
                <th>Workflow</th>
                <th>Category</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} onClick={() => handleSelectProduct(p.id)} style={{ cursor: "pointer" }}>
                  <td>{p.sku}</td>
                  <td>{p.title}</td>
                  <td>{p.status}</td>
                  <td>{p.workflowStatus || "—"}</td>
                  <td>{p.category || "—"}</td>
                  <td>{p.qualityScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected && (
            <div className="admin-detail">
              <h3>{selected.title}</h3>
              <p>SKU: {selected.sku} · Brand: {selected.brand?.name || "—"}</p>
              <button type="button" onClick={handleValidate}>Validate</button>
              <button type="button" onClick={handleLoadAttributes}>Category attributes</button>
            </div>
          )}
        </section>
      )}

      {tab === "brands" && (
        <section className="admin-panel">
          <h2>Brands</h2>
          <ul>
            {brands.map((b) => (
              <li key={b.id}>{b.name} ({b.slug}) — {b.status}</li>
            ))}
          </ul>
        </section>
      )}

      {tab === "import" && (
        <section className="admin-panel">
          <h2>Import Pipeline</h2>
          <p className="admin-note">Supplier → Raw → Validation → Normalization → Mapping → PIM (dry-run default)</p>
          <button type="button" onClick={handleDryRunImport}>Run dry-run import</button>
          {importResult && <pre>{importResult}</pre>}
        </section>
      )}

      {tab === "validation" && (
        <section className="admin-panel">
          <h2>Validation</h2>
          {!validation && <p>Select a product and run validation from Products tab.</p>}
          {validation && (
            <>
              <p>
                Overall: <strong>{validation.overall}</strong> ({validation.failCount} fail, {validation.warningCount}{" "}
                warn)
              </p>
              {validationReport && (
                <p>
                  Structured: {validationReport.status} · valid={String(validationReport.valid)} · missing:{" "}
                  {validationReport.missingFields.join(", ") || "—"}
                </p>
              )}
              <ul>
                {validation.results.map((r) => (
                  <li key={r.field}>
                    {r.field}: {r.status}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === "mapping" && (
        <section className="admin-panel">
          <h2>Supplier Mapping</h2>
          {mappings.length === 0 ? (
            <p>No mappings yet. Use import pipeline or API to create mappings.</p>
          ) : (
            <ul>
              {mappings.map((m) => (
                <li key={m.id}>
                  {m.supplierId} / {m.supplierSku || "—"} → {m.internalSku || "unmapped"} (conf: {m.confidence ?? "—"})
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "attributes" && (
        <section className="admin-panel">
          <h2>Dynamic Attributes (cat-05 Automotive)</h2>
          <pre>{attributeSchema || "Load schema from Products tab"}</pre>
        </section>
      )}

      <section className="admin-panel admin-note">
        <h2>AI Foundation</h2>
        <p>Capabilities (approval required): {aiCaps.join(", ")}</p>
        {quality && <p>Selected product quality score: {quality.score}/100</p>}
      </section>
    </div>
  );
}
