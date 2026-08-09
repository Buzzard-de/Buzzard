"use client";

import { useEffect, useState } from "react";
import { fetchIntegrationStatus } from "@/lib/integrations/client";
import type { CommercialIntegrationStatus } from "@/lib/integrations/types";

function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <strong className={ready ? "integration-status-ok" : "integration-status-pending"}>
      {ready ? "VERBUNDEN" : "KONFIGURIEREN"}
    </strong>
  );
}

export default function AdminIntegrationsPanel() {
  const [data, setData] = useState<CommercialIntegrationStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchIntegrationStatus()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "integrations.requestFailed"));
  }, []);

  const groups: Array<[string, Record<string, boolean> | boolean | undefined]> = data
    ? [
        ["Zahlungen", data.payments],
        ["Versanddienstleister", data.carriers],
        ["Steuer", { tax: Boolean(data.tax) }],
        ["Wechselkurse", { fx: Boolean(data.fx) }],
        ["Lieferanten", { supplier: Boolean(data.supplier) }],
        ["TecDoc", { tecdoc: Boolean(data.tecdoc) }],
      ]
    : [];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>Commercial Integrations</h1>
        {data?.version && <span className="admin-note">API v{data.version}</span>}
      </div>

      <p className="admin-note">
        Status der Zahlungs-, Versand-, Steuer-, FX-, Lieferanten- und TecDoc-Adapter. Es sind keine Live-Credentials
        enthalten — die Adapter sind sichere Platzhalter bis Merchant-Konten und API-Keys hinterlegt sind.
      </p>

      {error && <p className="shop-modal-error">{error}</p>}

      {data && (
        <div className="integration-groups">
          {groups.map(([title, items]) => (
            <section key={title} className="admin-panel integration-group">
              <h2>{title}</h2>
              {items &&
                typeof items === "object" &&
                Object.entries(items).map(([name, ready]) => (
                  <div key={name} className="integration-row">
                    <span>{name}</span>
                    <StatusBadge ready={Boolean(ready)} />
                  </div>
                ))}
            </section>
          ))}

          {data.webhooks && (
            <section className="admin-panel integration-group">
              <h2>Webhooks</h2>
              <p className="admin-note">{data.webhooks.note}</p>
              <div className="integration-row">
                <span>Signierte Provider-Webhooks</span>
                <StatusBadge ready={Boolean(data.webhooks.configured)} />
              </div>
            </section>
          )}
        </div>
      )}

      <section className="admin-panel">
        <h2>Nächste Produktionsschritte</h2>
        <ol className="admin-list">
          <li>Provider-Credentials im Secret Manager hinterlegen (Stripe, PayPal, Klarna, DHL, …).</li>
          <li>Offizielle SDK/API-Aufrufe und signierte Webhooks implementieren.</li>
          <li>MwSt./OSS-Regeln mit Steuer-Provider oder Fachberater klären.</li>
          <li>Carrier-Verträge und Label-/Tracking-Endpunkte konfigurieren.</li>
          <li>Lieferanten-Feeds und lizenzierte TecDoc-Services anbinden.</li>
        </ol>
      </section>
    </div>
  );
}
