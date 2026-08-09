#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

const MODULES = [
  {
    version: "3.2.0",
    versionShort: "3.2",
    title: "Order Management System",
    subtitle: "Orders, lifecycle, split orders, supplier routing and tracking",
    slug: "order-management-v32",
    camel: "orderManagementV32",
    Pascal: "OrderManagementV32",
    prefix: "oms32",
    envSnake: "ORDER_MANAGEMENT_V32",
    navLabel: "OMS v3.2",
    demoCode: "DEMO-OMS",
    demoName: "Buzzard Demo Order Pipeline",
    features: ["Orders", "Order items", "Status lifecycle", "Split orders", "Partial fulfillment", "Supplier routing", "Tracking"],
  },
  {
    version: "3.3.0",
    versionShort: "3.3",
    title: "Fulfillment & Warehouse",
    subtitle: "Warehouses, reservations, pick-pack-ship workflow and bins",
    slug: "fulfillment-v33",
    camel: "fulfillmentV33",
    Pascal: "FulfillmentV33",
    prefix: "ful33",
    envSnake: "FULFILLMENT_V33",
    navLabel: "Fulfill v3.3",
    demoCode: "DEMO-FUL",
    demoName: "Buzzard Demo Warehouse",
    features: ["Warehouses", "Inventory reservations", "Pick-pack-ship", "Bins", "Fulfillment jobs"],
  },
  {
    version: "3.4.0",
    versionShort: "3.4",
    title: "Logistics & Shipping",
    subtitle: "Carriers, labels, tracking events and shipping zones",
    slug: "logistics-v34",
    camel: "logisticsV34",
    Pascal: "LogisticsV34",
    prefix: "log34",
    envSnake: "LOGISTICS_V34",
    navLabel: "Logistics v3.4",
    demoCode: "DEMO-LOG",
    demoName: "Buzzard Demo Shipping Hub",
    features: ["Carriers", "Shipping labels", "Tracking events", "Zones", "Delivery promises"],
  },
  {
    version: "3.5.0",
    versionShort: "3.5",
    title: "Marketplace Integration",
    subtitle: "Channel listings, sync jobs and marketplace orders",
    slug: "marketplace-v35",
    camel: "marketplaceV35",
    Pascal: "MarketplaceV35",
    prefix: "mkt35",
    envSnake: "MARKETPLACE_V35",
    navLabel: "Market v3.5",
    demoCode: "DEMO-MKT",
    demoName: "Buzzard Demo Marketplace",
    features: ["Channel listings", "Inventory sync", "Order import", "Price rules", "Marketplace jobs"],
  },
  {
    version: "3.6.0",
    versionShort: "3.6",
    title: "Payments & Finance",
    subtitle: "Payment providers, settlements, refunds and finance jobs",
    slug: "payments-v36",
    camel: "paymentsV36",
    Pascal: "PaymentsV36",
    prefix: "pay36",
    envSnake: "PAYMENTS_V36",
    navLabel: "Pay v3.6",
    demoCode: "DEMO-PAY",
    demoName: "Buzzard Demo Payments",
    features: ["Payment providers", "Settlements", "Refunds", "Invoices", "Finance jobs"],
  },
  {
    version: "3.7.0",
    versionShort: "3.7",
    title: "Europe & International",
    subtitle: "Locales, currencies, tax zones and cross-border rules",
    slug: "international-v37",
    camel: "internationalV37",
    Pascal: "InternationalV37",
    prefix: "int37",
    envSnake: "INTERNATIONAL_V37",
    navLabel: "Intl v3.7",
    demoCode: "DEMO-INT",
    demoName: "Buzzard Demo EU Markets",
    features: ["Locales", "Currencies", "Tax zones", "Cross-border rules", "Regional feeds"],
  },
  {
    version: "3.8.0",
    versionShort: "3.8",
    title: "Security & Compliance",
    subtitle: "Policies, audit events, access controls and compliance jobs",
    slug: "security-v38",
    camel: "securityV38",
    Pascal: "SecurityV38",
    prefix: "sec38",
    envSnake: "SECURITY_V38",
    navLabel: "Security v3.8",
    demoCode: "DEMO-SEC",
    demoName: "Buzzard Demo Security",
    features: ["Policies", "Audit events", "Access controls", "Compliance checks", "Security jobs"],
  },
  {
    version: "3.9.0",
    versionShort: "3.9",
    title: "Analytics & BI",
    subtitle: "Dashboards, KPI snapshots, reports and analytics jobs",
    slug: "analytics-v39",
    camel: "analyticsV39",
    Pascal: "AnalyticsV39",
    prefix: "anl39",
    envSnake: "ANALYTICS_V39",
    navLabel: "Analytics v3.9",
    demoCode: "DEMO-ANL",
    demoName: "Buzzard Demo Analytics",
    features: ["Dashboards", "KPI snapshots", "Reports", "Segments", "Analytics jobs"],
  },
  {
    version: "4.0.0",
    versionShort: "4.0",
    title: "Master Admin & Platform Control",
    subtitle: "Unified dashboard, module health, feature flags and platform settings",
    slug: "master-admin-v40",
    camel: "masterAdminV40",
    Pascal: "MasterAdminV40",
    prefix: "mad40",
    envSnake: "MASTER_ADMIN_V40",
    navLabel: "Master v4.0",
    demoCode: "DEMO-MASTER",
    demoName: "Buzzard Platform Control",
    features: ["Unified dashboard", "Module health", "Jobs", "Feature flags", "Platform settings", "Audit overview"],
  },
];

function write(relPath, content) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log("wrote", relPath);
}

function libJs(m) {
  const statusFn = `get${m.Pascal}Status`;
  const overviewFn = `get${m.Pascal}Overview`;
  return `const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_${m.envSnake} !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function createRecord(body = {}) {
  if (!body.code || !body.name) {
    return { error: "code and name required", status: 400 };
  }
  try {
    const result = db
      .prepare(\`
        INSERT INTO ${m.prefix}_records(code, name, status, data_json)
        VALUES(?,?,?,?)
      \`)
      .run(body.code, body.name, body.status || "active", JSON.stringify(body.data || {}));
    return {
      record: db.prepare("SELECT * FROM ${m.prefix}_records WHERE id = ?").get(result.lastInsertRowid),
      created: true,
    };
  } catch {
    return { error: "code already exists", status: 409 };
  }
}

function listRecords() {
  return db.prepare("SELECT * FROM ${m.prefix}_records ORDER BY id DESC").all();
}

function getRecordByCode(code) {
  return db.prepare("SELECT * FROM ${m.prefix}_records WHERE code = ?").get(code);
}

function updateRecord(id, body = {}) {
  const existing = db.prepare("SELECT * FROM ${m.prefix}_records WHERE id = ?").get(id);
  if (!existing) return { error: "not found", status: 404 };
  db.prepare(\`
    UPDATE ${m.prefix}_records
    SET name = ?, status = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  \`).run(
    body.name ?? existing.name,
    body.status ?? existing.status,
    JSON.stringify(body.data ?? JSON.parse(existing.data_json || "{}")),
    existing.id
  );
  return { record: db.prepare("SELECT * FROM ${m.prefix}_records WHERE id = ?").get(existing.id) };
}

function createJob(body = {}) {
  const result = db
    .prepare(\`
      INSERT INTO ${m.prefix}_jobs(type, payload_json)
      VALUES(?,?)
    \`)
    .run(body.type || "sync", JSON.stringify(body.payload || {}));
  return { jobId: result.lastInsertRowid, status: "queued" };
}

function listJobs() {
  return db.prepare("SELECT * FROM ${m.prefix}_jobs ORDER BY id DESC LIMIT 200").all();
}

function ${overviewFn}() {
  return {
    records: db.prepare("SELECT COUNT(*) n FROM ${m.prefix}_records").get().n,
    active: db.prepare("SELECT COUNT(*) n FROM ${m.prefix}_records WHERE status = 'active'").get().n,
    jobs: db.prepare("SELECT COUNT(*) n FROM ${m.prefix}_jobs").get().n,
    queuedJobs: db.prepare("SELECT COUNT(*) n FROM ${m.prefix}_jobs WHERE status = 'queued'").get().n,
  };
}

function ${statusFn}() {
  const overview = ${overviewFn}();
  return {
    version: "${m.version}",
    module: "${m.title}",
    enabled: isEnabled(),
    totals: overview,
    overview,
  };
}

module.exports = {
  isEnabled,
  createRecord,
  listRecords,
  getRecordByCode,
  updateRecord,
  createJob,
  listJobs,
  ${overviewFn},
  ${statusFn},
};
`;
}

function pluginJs(m) {
  return `const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const mod = require("../lib/${m.camel}");

function requireAnyAdmin(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      const user = verifyToken(bearer);
      if (user.role === "admin") {
        req.user = user;
        return user;
      }
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ error: "Admin access required" });
  return null;
}

module.exports = {
  register(app) {
    if (!mod.isEnabled()) {
      console.log("${m.title} disabled (BUZZARD_${m.envSnake}=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/${m.slug}/records", (req, res) => {
      const result = mod.createRecord(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.record);
    });

    app.get("/api/${m.slug}/records", (req, res) => {
      return res.json(mod.listRecords());
    });

    app.get("/api/${m.slug}/records/:code", (req, res) => {
      const record = mod.getRecordByCode(req.params.code);
      if (!record) return res.status(404).json({ error: "not found" });
      return res.json(record);
    });

    app.patch("/api/${m.slug}/records/:id", (req, res) => {
      const result = mod.updateRecord(Number(req.params.id), req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.record);
    });

    app.post("/api/${m.slug}/jobs", (req, res) => {
      return res.status(202).json(mod.createJob(req.body || {}));
    });

    app.get("/api/${m.slug}/jobs", (req, res) => {
      return res.json(mod.listJobs());
    });

    app.get("/api/admin/${m.slug}/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(mod.get${m.Pascal}Overview());
    });
  },
};
`;
}

function migrationJs(m) {
  return `
function migrate${m.Pascal}() {
  db.exec(\`
    CREATE TABLE IF NOT EXISTS ${m.prefix}_records(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      data_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ${m.prefix}_jobs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      payload_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );
  \`);

  const count = db.prepare("SELECT COUNT(*) n FROM ${m.prefix}_records").get().n;
  if (count === 0) {
    db.prepare(\`
      INSERT INTO ${m.prefix}_records(code, name, status, data_json)
      VALUES(?,?,?,?)
    \`).run(
      "${m.demoCode}",
      "${m.demoName}",
      "active",
      JSON.stringify({ version: "${m.versionShort}", module: "${m.title}" })
    );
  }
}

migrate${m.Pascal}();
`;
}

function typesTs(m) {
  return `export interface ${m.Pascal}Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface ${m.Pascal}Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface ${m.Pascal}Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface ${m.Pascal}Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: ${m.Pascal}Overview;
  overview: ${m.Pascal}Overview;
}
`;
}

function clientTs(m) {
  const key = m.camel;
  return `import type { ${m.Pascal}Overview, ${m.Pascal}Record, ${m.Pascal}Status } from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\\/$/, "");
}

function adminHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(adminToken ? { Authorization: \`Bearer \${adminToken}\` } : {}),
  };
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("${key}.apiUnavailable");
  const res = await fetch(\`\${base}\${path}\`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "${key}.requestFailed");
  return data;
}

export async function fetch${m.Pascal}Status(): Promise<${m.Pascal}Status> {
  const base = apiBase();
  if (!base) throw new Error("${key}.apiUnavailable");
  const res = await fetch(\`\${base}/api/health\`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("${key}.requestFailed");
  const data = (await res.json()) as { ${key}?: ${m.Pascal}Status };
  if (!data.${key}?.enabled) throw new Error("${key}.disabled");
  return data.${key};
}

export async function fetch${m.Pascal}Overview(): Promise<${m.Pascal}Overview> {
  return adminRequest<${m.Pascal}Overview>("/api/admin/${m.slug}/overview");
}

export async function fetch${m.Pascal}Records(): Promise<${m.Pascal}Record[]> {
  return adminRequest<${m.Pascal}Record[]>("/api/${m.slug}/records");
}
`;
}

function panelTsx(m) {
  const features = m.features.map((f) => `"${f}"`).join(",\n  ");
  return `"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetch${m.Pascal}Overview,
  fetch${m.Pascal}Records,
  fetch${m.Pascal}Status,
} from "@/lib/${m.camel}/client";
import type { ${m.Pascal}Overview, ${m.Pascal}Record, ${m.Pascal}Status } from "@/lib/${m.camel}/types";

const FEATURES = [
  ${features},
];

export default function Admin${m.Pascal}Panel() {
  const [status, setStatus] = useState<${m.Pascal}Status | null>(null);
  const [overview, setOverview] = useState<${m.Pascal}Overview | null>(null);
  const [records, setRecords] = useState<${m.Pascal}Record[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, recordRows] = await Promise.all([
      fetch${m.Pascal}Status(),
      fetch${m.Pascal}Overview(),
      fetch${m.Pascal}Records(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setRecords(recordRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "${m.camel}.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade ${m.title}…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>${m.title} v${m.versionShort}</h1>
        <p>${m.subtitle}</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Records", overview.records],
            ["Active", overview.active],
            ["Jobs", overview.jobs],
            ["Queued", overview.queuedJobs],
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
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Refresh
          </button>
        </div>

        <h2>Records</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.code}</strong></td>
                  <td>{row.name}</td>
                  <td>{row.status}</td>
                  <td>{row.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Module capabilities</h2>
        <ul className="admin-feature-list">
          {FEATURES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {status && <p className="admin-meta">API version {status.version}</p>}
      </section>
    </div>
  );
}
`;
}

function pageTsx(m) {
  return `import Admin${m.Pascal}Panel from "@/components/admin/Admin${m.Pascal}Panel";

export const metadata = {
  title: "Admin ${m.title} – Buzzard",
  robots: { index: false, follow: false },
};

export default function Admin${m.Pascal}Page() {
  return <Admin${m.Pascal}Panel />;
}
`;
}

for (const m of MODULES) {
  write(`server/lib/${m.camel}.js`, libJs(m));
  write(`server/plugins/${m.camel}Plugin.js`, pluginJs(m));
  write(`lib/${m.camel}/types.ts`, typesTs(m));
  write(`lib/${m.camel}/client.ts`, clientTs(m));
  write(`components/admin/Admin${m.Pascal}Panel.tsx`, panelTsx(m));
  write(`app/admin/${m.slug}/page.tsx`, pageTsx(m));
}

const dbPath = path.join(ROOT, "server/lib/db.js");
let dbContent = fs.readFileSync(dbPath, "utf8");
const marker = "migrateProductCatalogPimV30();";
if (!dbContent.includes(marker)) {
  throw new Error("db.js marker not found");
}
const migrations = MODULES.map((m) => migrationJs(m)).join("\n");
dbContent = dbContent.replace(marker, `${marker}\n${migrations}`);
fs.writeFileSync(dbPath, dbContent);
console.log("updated server/lib/db.js");

console.log("Generated", MODULES.length, "modules");
