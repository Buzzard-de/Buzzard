"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchCategoryAttributeSchema,
  fetchPimAiCapabilities,
  fetchPimBrands,
  fetchPimProducts,
  fetchPimQuality,
  fetchSupplierMappings,
  runPimImport,
  validatePimProduct,
} from "@/lib/admin/pimCore";
import { useCan } from "@/lib/admin/permissions";
import { isPimImportPending, pimImportPendingSummary } from "@/lib/admin/pimCoreTypes";
import type {
  PimImportResult,
  PimBrand,
  PimImportPendingApproval,
  PimProduct,
  PimSupplierMapping,
  PimValidationResult,
} from "@/lib/admin/pimCoreTypes";

type Tab = "products" | "brands" | "import" | "validation" | "mapping" | "attributes";

export default function AdminPimCorePanel() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<PimProduct[]>([]);
  const [brands, setBrands] = useState<PimBrand[]>([]);
  const [mappings, setMappings] = useState<PimSupplierMapping[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validation, setValidation] = useState<PimValidationResult | null>(null);
  const [quality, setQuality] = useState<{ score: number; dimensions: Record<string, number> } | null>(null);
  const [importResult, setImportResult] = useState<PimImportResult | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const can = useCan();
  // The import route asks for both; the API decides, this only keeps the page from offering a refused action.
  const mayImport = can("products.write") && can("imports.run");
  const mayValidate = can("products.write");
  const maySeeMappings = can("suppliers.read");
  const [importPending, setImportPending] = useState<PimImportPendingApproval | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [attributeSchema, setAttributeSchema] = useState<string | null>(null);
  const [aiCaps, setAiCaps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Supplier mappings need suppliers.read on top of the page's products.read.
    const [productRows, brandRows, mappingRows, caps] = await Promise.all([
      fetchPimProducts(),
      fetchPimBrands(),
      maySeeMappings ? fetchSupplierMappings() : [],
      fetchPimAiCapabilities(),
    ]);
    setProducts(productRows);
    setBrands(brandRows);
    setMappings(mappingRows);
    setAiCaps(caps);
    if (productRows[0] && !selectedId) setSelectedId(productRows[0].id);
  }, [selectedId, maySeeMappings]);

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
    if (!selectedId || !mayValidate) return;
    setValidateError(null);
    try {
      const result = await validatePimProduct(selectedId);
      setValidation(result);
      setTab("validation");
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : "admin.requestFailed");
    }
  }

  async function handleDryRunImport() {
    setImportResult(null);
    setImportPending(null);
    setImportError(null);
    setTab("import");
    if (!mayImport || importBusy) return;
    setImportBusy(true);
    try {
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
      if (isPimImportPending(result)) {
        setImportPending(result);
        return;
      }
      setImportResult(result);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "admin.requestFailed");
    } finally {
      setImportBusy(false);
    }
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
        <p>Category-agnostic PIM foundation (Part 6). Sales remain disabled.</p>
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
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Title</th>
                <th>Status</th>
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
              <button
                type="button"
                onClick={handleValidate}
                disabled={!mayValidate}
                title={mayValidate ? undefined : "Ihre Rolle darf Produkte nicht validieren (products.write)."}
              >
                Validate
              </button>
              <button type="button" onClick={handleLoadAttributes}>Category attributes</button>
              {validateError && (
                <p className="admin-error" role="alert" data-testid="pim-validate-error">
                  Validation request failed: {validateError}
                </p>
              )}
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
          <button type="button" onClick={handleDryRunImport} disabled={!mayImport || importBusy}>
            Run dry-run import
          </button>
          {!mayImport && (
            <p className="admin-note" data-testid="pim-import-no-permission">
              Ihre Rolle darf keinen Import anfordern (products.write und imports.run erforderlich).
            </p>
          )}
          {importPending &&
            (() => {
              const pending = pimImportPendingSummary(importPending);
              return (
                <div className="admin-note" role="status" data-testid="pim-import-pending">
                  <p>
                    <strong>Dry run pending approval</strong> — not executed. Nothing was imported or validated yet.
                  </p>
                  <dl className="admin-facts">
                    <dt>State</dt>
                    <dd data-testid="pim-import-state">pendingApproval</dd>
                    <dt>Approval</dt>
                    <dd data-testid="pim-import-approval-id">{pending.approvalId || "—"}</dd>
                    <dt>Approval status</dt>
                    <dd data-testid="pim-import-approval-status">{pending.status}</dd>
                    {pending.riskLevel && (
                      <>
                        <dt>Risk</dt>
                        <dd>{pending.riskLevel}</dd>
                      </>
                    )}
                    <dt>Import job</dt>
                    <dd data-testid="pim-import-job-id">
                      {pending.importJobId ? `${pending.importJobId} (reserved, not started)` : "— (none yet)"}
                    </dd>
                    <dt>Validation</dt>
                    <dd data-testid="pim-import-validation">not run</dd>
                  </dl>
                  <p data-testid="pim-import-after-approval">
                    A person decides on this request in the{" "}
                    <Link href="/admin/control-center/">Control Center</Link> (tab “Onaylar”). The decision is
                    recorded there; an approval does not start the dry run, and sending the request again opens a
                    new request.
                  </p>
                </div>
              );
            })()}
          {importError && (
            <p className="admin-error" role="alert" data-testid="pim-import-error">
              Dry run request failed: {importError}
            </p>
          )}
          {importResult && (
            <div className="admin-note" role="status" data-testid="pim-import-result">
              <p>
                <strong>{importResult.dryRun ? "Dry run finished" : "Import finished"}</strong>
                {importResult.dryRun ? " — nothing was written to the catalog." : ""}
              </p>
              <dl className="admin-facts">
                <dt>Import job</dt>
                <dd data-testid="pim-import-job-id">{importResult.importJobId}</dd>
                <dt>Validation</dt>
                <dd data-testid="pim-import-validation">
                  {importResult.validation.overall} ({importResult.validation.failCount} fail,{" "}
                  {importResult.validation.warningCount} warn)
                </dd>
                <dt>Stages</dt>
                <dd>{importResult.stages.map((stage) => `${stage.stage}: ${stage.status}`).join(" · ")}</dd>
              </dl>
            </div>
          )}
        </section>
      )}

      {tab === "validation" && (
        <section className="admin-panel">
          <h2>Validation</h2>
          {!validation && <p>Select a product and run validation from Products tab.</p>}
          {validation && (
            <>
              <p>Overall: <strong>{validation.overall}</strong> ({validation.failCount} fail, {validation.warningCount} warn)</p>
              <ul>
                {validation.results.map((r) => (
                  <li key={r.field}>{r.field}: {r.status}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === "mapping" && (
        <section className="admin-panel">
          <h2>Supplier Mapping</h2>
          {!maySeeMappings ? (
            <p className="admin-note" data-testid="pim-mappings-no-permission">
              Ihre Rolle darf Lieferanten-Zuordnungen nicht einsehen (suppliers.read erforderlich).
            </p>
          ) : mappings.length === 0 ? (
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
